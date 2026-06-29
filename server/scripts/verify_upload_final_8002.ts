import 'dotenv/config';
import { signInWithPassword, createAuthUser } from '../auth';
import { execSync } from 'child_process';
import path from 'path';

async function main() {
    const email = 'test_verified_uploader@example.com';
    const password = 'testpassword123';

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

        // Use curl from system
        const dummyFile = path.resolve(process.cwd(), 'tmp/dummy.txt');
        const cmd = `curl -X POST http://localhost:8002/api/checkpoints/1/upload -H "Authorization: Bearer ${token}" -F "file=@${dummyFile}" --fail --silent --show-error`;

        console.log(`Executing curl...`);
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
