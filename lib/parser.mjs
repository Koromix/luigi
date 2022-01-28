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

import * as std_basic from './std/basic.mjs';
import * as std_graphics from './std/graphics.mjs';

let functions;
let default_func;
let current_func;

let tokens;
let offset;

export function parse(_tokens) {
    functions = {};

    import_natives(functions, std_basic);
    import_natives(functions, std_graphics);

    default_func = {
        name: '.',
        params: [],
        instructions: [],
        variables: {}
    };
    current_func = default_func;
    functions['.'] = default_func;

    tokens = _tokens;
    offset = 0;

    parse_code([]);

    return functions;
}

function import_natives(functions, natives) {
    for (let name in natives) {
        let native = natives[name];

        let code = native.toString();
        let signature = code.match(/\((.*)\)/)[1].trim();
        let params = signature.length ? signature.split(',').map(param => param.trim()) : [];

        let func = {
            name: name,
            params: params,
            native: native
        };

        functions[name] = func;
    }
}

function parse_code(enders) {
    while (offset < tokens.length) {
        let tok = tokens[offset];

        if (enders.includes(tok.type))
            break;

        if (tok.type == 'identifier') {
            parse_declaration();
        } else if (tok.type == 'if') {
            parse_if();
        } else if (tok.type == 'while') {
            parse_while();
        } else if (tok.type == 'func') {
            parse_func();
        } else if (tok.type == 'return') {
            parse_return();
        } else if (tok.type == 'EOL') {
            offset++; // Do nothing
        } else {
            parse_expression();
            emit('pop');

            consume('EOL');
        }
    }
}

function parse_declaration() {
    if (tokens[offset + 1].type != '[' &&
            tokens[offset + 1].type != '.' &&
            tokens[offset + 1].type != '=') {
        parse_expression();
        emit('pop');

        return;
    }

    let name = consume('identifier');

    let variable = find_variable(name);
    if (variable == null) {
        variable = { name: name };
        current_func.variables[name] = variable;
    }

    if (match('[')) {
        emit('load', name);
        parse_expression();
        consume(']');

        consume('=');
        parse_expression();

        emit('put');
    } else if (match('.')) {
        emit('load', name);

        let member = consume('identifier');

        consume('=');
        parse_expression();

        emit('set', member);
    } else if (match('=')) {
        parse_expression();
        emit('store', name);
    }

    consume('EOL');
}

function parse_if() {
    offset++;

    let jumps = [];
    let branch;

    parse_expression();
    branch = emit('branch');

    if (match('then')) {
        if (tokens[offset].type == 'identifier') {
            parse_declaration();
        } else if (tokens[offset].type == 'return') {
            parse_return();
        } else {
            parse_expression();
            emit('pop');

            consume('EOL');
        }

        branch.value = current_func.instructions.length;
    } else {
        consume('EOL');

        parse_code(['end', 'elif', 'else']);
        jumps.push(emit('jump'));
        branch.value = current_func.instructions.length;

        while (match('elif')) {
            parse_expression();
            branch = emit('branch');
            consume('EOL');
            parse_code(['end', 'elif', 'else']);
            jumps.push(emit('jump'));
            branch.value = current_func.instructions.length;
        }

        if (match('else')) {
            consume('EOL');
            parse_code(['end']);
        }

        consume('end');
    }

    for (let jump of jumps)
        jump.value = current_func.instructions.length;
}

function parse_while() {
    offset++;

    let addr;
    let branch;

    addr = current_func.instructions.length;
    parse_expression();
    consume('EOL');
    branch = emit('branch');

    parse_code(['end']);
    emit('jump', addr);
    branch.value = current_func.instructions.length;

    consume('end');
    consume('EOL');
}

function parse_func() {
    let start = offset++;

    let func = {
        name: consume('identifier'),
        params: [],
        instructions: [],
        variables: {}
    };

    if (current_func != default_func)
        error(start, "Nested functions are not allowed");
    if (functions[func.name] != null)
        error(start + 1, `Function "${func.name}" already exists`);

    consume('(');
    while (offset < tokens.length) {
        let param = match('identifier');
        if (param == null)
            break;

        if (func.variables[param] != null)
            error(offset - 1, `Parameter name "${param}" is already used`);

        func.params.push(param);
        func.variables[param] = { name: param };

        if (!match(','))
            break;
        skip_eol();
    }
    consume(')');
    consume('EOL');

    functions[func.name] = func;

    current_func = func;
    parse_code(['end']);
    emit('value', null);
    emit('return');
    consume('end');
    current_func = default_func;

    consume('EOL');
}

function parse_return() {
    offset++;

    if (match('EOL')) {
        emit('value', null);
    } else {
        parse_expression();
        consume('EOL');
    }

    emit('return');
}

function parse_end() {
    if (current_func == default_func)
        error(offset, 'Unexpected token "end"');

    offset++;
    current_func = default_func;
}

// Expressions

const binary_operators = {
    'or': { priority: 0, code: 'or', right: false },
    'and': { priority: 1, code: 'and', right: false },
    '<': { priority: 3, code: 'less', right: false },
    '<=': { priority: 3, code: 'less_or_equal', right: false },
    '>': { priority: 3, code: 'greater', right: false },
    '>=': { priority: 3, code: 'greater_or_equal', right: false },
    '=': { priority: 3, code: 'equal', right: false },
    '!=': { priority: 3, code: 'not_equal', right: false },
    '+': { priority: 4, code: 'add', right: false },
    '-': { priority: 4, code: 'substract', right: false },
    '*': { priority: 5, code: 'multiply', right: false },
    '/': { priority: 5, code: 'divide', right: false }
};

const unary_operators = {
    '+': { priority: 6, code: null, right: true },
    '-': { priority: 6, code: 'negate', right: true },
    'not': { priority: 2, code: 'not', right: true }
};

function parse_expression() {
    let first = offset;
    let pending_operators = [];
    let want_op = false;

    while (offset < tokens.length) {
        let tok = tokens[offset];

        if (tok.type == 'boolean' ||
                tok.type == 'number' ||
                tok.type == 'string') {
            if (want_op)
                error(offset, 'Expected operator, not value');
            want_op = true;

            emit('value', tok.value);
        } else if (tok.type == 'null') {
            if (want_op)
                error(offset, 'Expected operator, not value');
            want_op = true;

            emit('value', null);
        } else if (tok.type == 'identifier') {
            if (want_op)
                error(offset, 'Expected operator, not value');
            want_op = true;

            if (tokens[offset + 1].type == '(') {
                let start = offset++;

                let func = functions[tok.value];
                if (func == null)
                    error(start, `Function "${tok.value}" does not exist`);

                let arity = 0;

                consume('(');
                skip_eol();
                if (tokens[offset].type != ')') {
                    parse_expression();
                    arity++;
                    while (match(',')) {
                        skip_eol();
                        parse_expression();
                        arity++;
                    }
                }
                skip_eol();
                consume(')');

                if (arity != func.params.length)
                    error(start + 2, `Function "${func.name}" expects ${func.params.length} arguments, not ${arity}`);

                emit('call', func.name);
                offset--;
            } else {
                let variable = find_variable(tok.value);
                if (variable == null)
                    error(offset, `Variable "${tok.value}" does not exist`);

                emit('load', tok.value);
            }
        } else if (tok.type == '(') {
            if (want_op)
                error(offset, 'Expected operator, not value');

            pending_operators.push('(');
        } else if (tok.type == ')') {
            if (!want_op)
                error(offset, 'Expected value, not ")"');

            let ok = false;

            while (pending_operators.length) {
                let pending = pending_operators.pop();
                if (pending == '(') {
                    ok = true;
                    break;
                }
                emit_operator(pending);
            }

            if (!ok)
                break;
        } else if (tok.type == '[') {
            let start = offset++;
            skip_eol();

            if (want_op) {
                parse_expression();
                emit('index');
                skip_eol();
                consume(']');
            } else {
                want_op = true;

                if (start > first)
                    error(start, 'Unexpected list definition');

                emit('list');
                while (tokens[offset].type != ']') {
                    parse_expression();
                    emit('append');

                    if (!match(','))
                        break;
                    skip_eol();
                }
                skip_eol();
                consume(']');
            }

            offset--;
        } else if (tok.type == '{') {
            let start = offset++;
            skip_eol();

            if (want_op)
                error(start, 'Unexpected token "{", expected operator');
            want_op = true;

            emit('object');
            while (tokens[offset].type != '}') {
                let member = consume('identifier');
                consume('=');
                skip_eol();
                parse_expression();
                emit('set', member);

                if (!match(','))
                    break;
                skip_eol();
            }
            skip_eol();
            consume('}');

            offset--;
        } else if (tok.type == '.') {
            let start = offset++;

            if (!want_op)
                error(start, 'Unexpected token ".", expected value');

            let member = consume('identifier');
            emit('get', member);

            offset--;
        } else {
            let op = want_op ? binary_operators[tok.type] : unary_operators[tok.type];

            if (op == null)
                break;
            want_op = false;

            while (pending_operators.length) {
                let pending = pending_operators[pending_operators.length - 1];

                if (pending == '(')
                    break;
                if (pending.priority - pending.right < op.priority)
                    break;

                emit_operator(pending);
                pending_operators.length--;
            }

            if (op.code == 'and') {
                op = Object.assign({}, op);
                op.skip = emit('skip_and');
                emit('skip_and');
            } else if (op.code == 'or') {
                op = Object.assign({}, op);
                op.skip = emit('skip_or');
            }

            pending_operators.push(op);
        }

        offset++;
    }

    if (offset == first)
        error(offset, `Unexpected token "${tokens[offset].type}", expected expression`);

    for (let i = pending_operators.length - 1; i >= 0; i--) {
        let pending = pending_operators[i];
        emit_operator(pending);
    }
}

function emit_operator(op) {
    if (op.code != null)
        emit(op.code);
    if (op.skip != null)
        op.skip.value = current_func.instructions.length;
}

// Utility

function find_variable(name) {
    let variable = current_func.variables[name];

    if (variable == null && current_func != default_func)
        variable = default_func.variables[name];

    return variable;
}

function emit(code, value) {
    if (value !== undefined) {
        let inst = { code: code, value: value };
        current_func.instructions.push(inst);
        return inst;
    } else {
        let inst = { code: code };
        current_func.instructions.push(inst);
        return inst;
    }
}

function consume(type) {
    if (tokens[offset].type != type)
        error(offset, `Unexpected token "${tokens[offset].type}", expected "${type}"`);

    let value = tokens[offset++].value;
    return value;
}

function match(type) {
    if (tokens[offset].type != type)
        return null;

    let value = tokens[offset++].value;
    return (value != null) ? value : true;
}

function skip_eol() {
    if (match('EOL')) {
        while (match('EOL'));
        return true;
    } else {
        return false;
    }
}

function error(offset, message) {
    let line = tokens[offset].line;
    let str = `Line ${line}: ${message}`;
    throw new Error(str);
}
