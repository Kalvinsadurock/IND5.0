import 'dotenv/config';
import { signInWithPassword, createAuthUser } from '../auth';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

async function main() {
    const email = 'test_verified_uploader@example.com';
    const password = 'testpassword123';
    const resultId = 191; // Valid ID found in DB
    const port = 8003;

    try {
        console.log(`Getting token for ${email}...`);
        let result: any = await signInWithPassword(email, password);

        if (result.error && (result.error.includes('Invalid login credentials') || result.error.includes('invalid_grant'))) {
            try {
                await createAuthUser(email, password);
                result = await signInWithPassword(email, password);
            } catch (err) {
                // ignore creation error if exists
            }
        }

        if (!result.access_token) {
            console.error('Failed to get token');
            process.exit(1);
        }

        const token = result.access_token;
        console.log('Token obtained.');

        // Dummy file
        const dummyFile = path.resolve(process.cwd(), 'tmp/fix_test.txt');
        if (!fs.existsSync(dummyFile)) fs.writeFileSync(dummyFile, 'Fix verification');

        const cmd = `curl -X POST http://localhost:${port}/api/checkpoints/${resultId}/upload -H "Authorization: Bearer ${token}" -F "file=@${dummyFile}" --fail --silent --show-error`;

        console.log(`Executing curl against port ${port} resultId ${resultId}...`);
        try {
            const stdout = execSync(cmd, { encoding: 'utf8' });
            console.log(`__RESPONSE_START__`);
            console.log(stdout);
            console.log(`__RESPONSE_END__`);
        } catch (error: any) {
            console.error(`exec error: ${error.message}`);
            if (error.stdout) console.log(`stdout: ${error.stdout}`);
            if (error.stderr) console.error(`stderr: ${error.stderr}`);
        }

    } catch (err) {
        console.error(err);
    }
}

main();
