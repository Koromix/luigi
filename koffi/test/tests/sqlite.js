#!/usr/bin/env node

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

const crypto = require('crypto');
const koffi = require('../../build/koffi.node');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const sqlite3_db = koffi.handle('sqlite3_db');
const sqlite3_stmt = koffi.handle('sqlite3_stmt');

main();

async function main() {
    try {
        await test();
        console.log('Success!');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

async function test() {
    let lib_filename = path.dirname(__filename) + '/../../build/sqlite3' +
                       (process.platform == 'win32' ? '.dll' : '.so');

    let sqlite3 = koffi.load(lib_filename, {
        sqlite3_open_v2: ['int', ['string', koffi.out(koffi.pointer(sqlite3_db)), 'int', 'string']],
        sqlite3_exec: ['int', [sqlite3_db, 'string', 'void *', 'void *', 'void *']],
        sqlite3_prepare_v2: ['int', [sqlite3_db, 'string', 'int', koffi.out(koffi.pointer(sqlite3_stmt)), 'string']],
        sqlite3_reset: ['int', [sqlite3_stmt]],
        sqlite3_bind_text: ['int', [sqlite3_stmt, 'int', 'string', 'int', 'void *']],
        sqlite3_bind_int: ['int', [sqlite3_stmt, 'int', 'int']],
        sqlite3_step: ['int', [sqlite3_stmt]],
        sqlite3_finalize: ['int', [sqlite3_stmt]],
        sqlite3_close_v2: ['int', [sqlite3_db]]
    });

    let filename = create_temporary_file(path.join(os.tmpdir(), 'test_sqlite'));
    let db = {};

    try {
        if (sqlite3.sqlite3_open_v2(filename, db, 0x2 | 0x4, null) != 0)
            throw new Error('Failed to open database');
        if (sqlite3.sqlite3_exec(db, 'CREATE TABLE foo (id INTEGER PRIMARY KEY, bar TEXT, value INT);', null, null, null) != 0)
            throw new Error('Failed to create table');

        let stmt = {};
        if (sqlite3.sqlite3_prepare_v2(db, "INSERT INTO foo (bar, value) VALUES (?1, ?2)", -1, stmt, null) != 0)
            throw new Error('Failed to prepare insert statement for table foo');
        for (let i = 0; i < 200; i++) {
            sqlite3.sqlite3_reset(stmt);

            sqlite3.sqlite3_bind_text(stmt, 1, `TXT ${i}`, -1, null);
            sqlite3.sqlite3_bind_int(stmt, 2, i * 2);

            if (sqlite3.sqlite3_step(stmt) != 101)
                throw new Erorr('Failed to insert new test row');
        }
        sqlite3.sqlite3_finalize(stmt);
    } finally {
        sqlite3.sqlite3_close_v2(db);
        fs.unlinkSync(filename);
    }
}

function create_temporary_file(prefix) {
    let buf = Buffer.allocUnsafe(4);

    for (;;) {
        try {
            crypto.randomFillSync(buf);

            let suffix = buf.toString('hex').padStart(8, '0');
            let filename = `${prefix}.${suffix}`;

            let file = fs.createWriteStream(filename, { flags: 'wx', mode: 0o644 });
            file.close();

            return filename;
        } catch (err) {
            if (err.code != 'EEXIST')
                throw err;
        }
    }
}