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

#include "libcc.hh"
#include "call.hh"
#include "ffi.hh"

#include <napi.h>

namespace RG {

const char *CopyNodeString(const Napi::Value &value, Allocator *alloc)
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

bool PushObject(const Napi::Object &obj, const TypeInfo *type, Allocator *alloc, uint8_t *dest)
{
    RG_ASSERT(obj.IsObject());
    RG_ASSERT(type->primitive == PrimitiveKind::Record);

    for (const RecordMember &member: type->members) {
        Napi::Value value = obj.Get(member.name);

        if (value.IsUndefined())
            return false;

        switch (member.type->primitive) {
            case PrimitiveKind::Void: { RG_UNREACHABLE(); } break;

            case PrimitiveKind::Bool:
            case PrimitiveKind::Int8:
            case PrimitiveKind::UInt8:
            case PrimitiveKind::Int16:
            case PrimitiveKind::UInt16:
            case PrimitiveKind::Int32:
            case PrimitiveKind::UInt32:
            case PrimitiveKind::Int64:
            case PrimitiveKind::UInt64: {
                dest = AlignUp(dest, member.type->size);

                if (value.IsNumber()) {
                    int64_t v = value.As<Napi::Number>();
                    memcpy(dest, &v, member.type->size); // Little Endian
                } else if (value.IsBigInt()) {
                    Napi::BigInt bigint = value.As<Napi::BigInt>();

                    bool lossless;
                    uint64_t v = bigint.Uint64Value(&lossless);

                    memcpy(dest, &v, member.type->size); // Little Endian
                } else {
                    return false;
                }
            } break;
            case PrimitiveKind::Float32: {
                dest = AlignUp(dest, 4);

                if (value.IsNumber()) {
                    float f = value.As<Napi::Number>();
                    memcpy(dest, &f, 4);
                } else if (value.IsBigInt()) {
                    Napi::BigInt bigint = value.As<Napi::BigInt>();

                    bool lossless;
                    float f = (float)bigint.Uint64Value(&lossless);

                    memcpy(dest, &f, 4);
                } else {
                    return false;
                }
            } break;
            case PrimitiveKind::Float64: {
                dest = AlignUp(dest, 8);

                if (value.IsNumber()) {
                    double d = value.As<Napi::Number>();
                    memcpy(dest, &d, 8);
                } else if (value.IsBigInt()) {
                    Napi::BigInt bigint = value.As<Napi::BigInt>();

                    bool lossless;
                    double d = (double)bigint.Uint64Value(&lossless);

                    memcpy(dest, &d, 8);
                } else {
                    return false;
                }
            } break;
            case PrimitiveKind::String: {
                dest = AlignUp(dest, 8);

                if (!value.IsString())
                    return false;

                const char *str = CopyNodeString(value, alloc);
                *(const char **)dest = str;
            } break;

            case PrimitiveKind::Record: {
                if (!value.IsObject())
                    return false;

                Napi::Object obj = value.As<Napi::Object>();
                if (!PushObject(obj, member.type, alloc, dest))
                    return false;
            } break;

            case PrimitiveKind::Pointer: {
                dest = AlignUp(dest, 8);

                if (!value.IsExternal())
                    return false;

                Napi::External external = value.As<Napi::External<void>>();
                void *ptr = external.Data();
                *(void **)dest = ptr;
            } break;
        }

        dest += member.type->size;
    }

    return true;
}

Napi::Object PopObject(napi_env env, const uint8_t *ptr, const TypeInfo *type)
{
    RG_ASSERT(type->primitive == PrimitiveKind::Record);

    Napi::Object obj = Napi::Object::New(env);

    for (const RecordMember &member: type->members) {
        // XXX: ptr = AlignUp(ptr, member.type->size);

        switch (member.type->primitive) {
            case PrimitiveKind::Void: { RG_UNREACHABLE(); } break;

            case PrimitiveKind::Bool: {
                bool b = *(bool *)ptr;
                obj.Set(member.name, Napi::Boolean::New(env, b));
            } break;
            case PrimitiveKind::Int8: {
                double d = (double)*(int8_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::UInt8: {
                double d = (double)*(uint8_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::Int16: {
                double d = (double)*(int16_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::UInt16: {
                double d = (double)*(uint16_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::Int32: {
                double d = (double)*(int32_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::UInt32: {
                double d = (double)*(uint32_t *)ptr;
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::Int64: {
                int64_t v = *(int64_t *)ptr;
                obj.Set(member.name, Napi::BigInt::New(env, v));
            } break;
            case PrimitiveKind::UInt64: {
                uint64_t v = *(uint64_t *)ptr;
                obj.Set(member.name, Napi::BigInt::New(env, v));
            } break;
            case PrimitiveKind::Float32: {
                float f;
                memcpy(&f, ptr, 4);
                obj.Set(member.name, Napi::Number::New(env, (double)f));
            } break;
            case PrimitiveKind::Float64: {
                double d;
                memcpy(&d, ptr, 8);
                obj.Set(member.name, Napi::Number::New(env, d));
            } break;
            case PrimitiveKind::String: {
                const char *str = *(const char **)ptr;
                obj.Set(member.name, Napi::String::New(env, str));
            } break;

            case PrimitiveKind::Record: {
                Napi::Object obj2 = PopObject(env, ptr, member.type);
                obj.Set(member.name, obj2);
            } break;

            case PrimitiveKind::Pointer: {
                void *ptr2 = *(void **)ptr;
                obj.Set(member.name, Napi::External<void>::New(env, ptr2));
            } break;
        }

        ptr += member.type->size;
    }

    return obj;
}

void DumpStack(const FunctionInfo *func, Span<const uint8_t> sp)
{
    PrintLn(stderr, "%!..+---- %1 ----%!0", func->name);

    PrintLn(stderr, "Parameters:");
    for (Size i = 0; i < func->parameters.len; i++) {
        const TypeInfo *type = func->parameters[i];
        PrintLn(stderr, "  %1 = %2 (small = %3, regular = %4, FP = %5/%6)", i, type->name,
                        type->is_small, type->is_regular, type->has_fp, type->all_fp);
    }

    PrintLn(stderr, "Stack (%1 bytes) at 0x%2:", sp.len, sp.ptr);
    for (const uint8_t *ptr = sp.begin(); ptr < sp.end();) {
        Print(stderr, "  [0x%1 %2]  ", FmtArg(ptr).Pad0(-16), FmtArg(ptr - sp.begin()).Pad(-4));
        for (int i = 0; ptr < sp.end() && i < 8; i++, ptr++) {
            Print(stderr, " %1", FmtHex(*ptr).Pad0(-2));
        }
        PrintLn(stderr);
    }
}

}