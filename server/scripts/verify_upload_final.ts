import 'dotenv/config';
import { signInWithPassword, createAuthUser } from '../auth';
import { exec } from 'child_process';
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
        const cmd = `curl -X POST http://localhost:8001/api/checkpoints/1/upload -H "Authorization: Bearer ${token}" -F "file=@${dummyFile}"`;

        console.log('Executing curl...');
        exec(cmd, (error: any, stdout: string, stderr: string) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        });

    } catch (err) {
        console.error(err);
    }
}

main();
