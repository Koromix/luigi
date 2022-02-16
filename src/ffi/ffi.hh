// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see https://www.gnu.org/licenses/.

#pragma once

#include "libcc.hh"

#include <napi.h>

namespace RG {

enum class PrimitiveKind {
    Void,
    Bool,
    Int8,
    UInt8,
    Int16,
    UInt16,
    Int32,
    UInt32,
    Int64,
    UInt64,
    Float32,
    Float64,
    String,
    Record,
    Pointer
};

struct TypeInfo;
struct RecordMember;
struct FunctionInfo;

struct TypeInfo {
    const char *name;

    PrimitiveKind primitive;
    int16_t size;
    int16_t align;

    HeapArray<RecordMember> members; // Record only
    const TypeInfo *ref; // Pointer only

    RG_HASHTABLE_HANDLER(TypeInfo, name);
};

struct RecordMember {
    const char *name;
    const TypeInfo *type;
};

class LibraryData {
public:
    ~LibraryData();

    void *module = nullptr; // HMODULE on Windows

    BlockAllocator tmp_alloc;
    HeapArray<uint8_t> stack;

    BlockAllocator str_alloc;
};

struct ParameterInfo {
    const TypeInfo *type;

    // ABI-specific part

#if defined(_WIN64)
    bool regular;
#elif defined(__x86_64__)
    bool ret_stack;
    int8_t gpr_count;
    int8_t xmm_count;
    bool gpr_first;
#elif defined(__aarch64__)
    bool hfa;
    int8_t gpr_count;
    int8_t vec_count;
    bool gpr_first;
#endif
};

struct FunctionInfo {
    const char *name;
    std::shared_ptr<LibraryData> lib;

    void *func;

    ParameterInfo ret;
    HeapArray<ParameterInfo> parameters;

    // Total size needed if all arguments were copied together (with align = 16)
    Size scratch_size; 
};

template <typename T, typename... Args>
static void ThrowError(Napi::Env env, const char *msg, Args... args)
{
    char buf[1024];
    Fmt(buf, msg, args...);

    T::New(env, buf).ThrowAsJavaScriptException();
}

static inline const char *GetTypeName(napi_valuetype type)
{
    switch (type) {
        case napi_undefined: return "undefined";
        case napi_null: return "null";
        case napi_boolean: return "boolean";
        case napi_number: return "number";
        case napi_string: return "string";
        case napi_symbol: return "symbol";
        case napi_object: return "object";
        case napi_function: return "fucntion";
        case napi_external: return "external";
        case napi_bigint: return "bigint";
    }

    return "unknown";
}

template <typename T>
bool CopyNodeNumber(const Napi::Value &value, T *out_value)
{
    if (value.IsNumber()) {
        *out_value = (T)value.As<Napi::Number>();
        return true;
    } else if (value.IsBigInt()) {
        Napi::BigInt bigint = value.As<Napi::BigInt>();

        bool lossless;
        *out_value = (T)bigint.Uint64Value(&lossless);

        return true;
    } else {
        Napi::Env env = value.Env();

        ThrowError<Napi::TypeError>(env, "Unexpected %1 value, expected number", GetTypeName(value.Type()));
        return false;
    }
}

static inline const char *CopyNodeString(const Napi::Value &value, Allocator *alloc)
{
    Napi::Env env = value.Env();
    napi_status status;

    size_t len = 0;
    status = napi_get_value_string_utf8(env, value, nullptr, 0, &len);
    RG_ASSERT(status == napi_ok);

    Span<char> buf;
    buf.len = (Size)len + 1;
    buf.ptr = (char *)Allocator::Allocate(alloc, buf.len);

    status = napi_get_value_string_utf8(env, value, buf.ptr, (size_t)buf.len, &len);
    RG_ASSERT(status == napi_ok);

    return buf.ptr;
}

}
