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

'use strict';

const process = require('process');
const fs = require('fs');
const path = require('path');
const luiggi = require('./src/index.js');

function main() {
    if (process.argv.length < 3) {
        print_usage();
        return;
    }

    try {
        let filename = process.argv[2];
        let dirname = path.dirname(filename);

        let code = fs.readFileSync(filename).toString('utf-8');
        process.chdir(dirname);

        luiggi.run(code);
    } catch (err) {
        console.error(err.message);
    }
}
main();

function print_usage() {
    let usage = `Usage: luiggi <script>`;
    console.log(usage);
}
