import 'dotenv/config';
import { signInWithPassword, createAuthUser } from '../auth';

async function main() {
    const email = 'test_verified_uploader@example.com';
    const password = 'testpassword123';

    console.log(`Trying to sign in as ${email}...`);
    let result: any = await signInWithPassword(email, password);

    if (result.error && (result.error.includes('Invalid login credentials') || result.error.includes('invalid_grant'))) {
        console.log('Sign in failed. Attempting to create user...');
        try {
            await createAuthUser(email, password);
            console.log('User created. Signing in again...');
            result = await signInWithPassword(email, password);
        } catch (createErr) {
            console.error('Failed to create user:', createErr);
            process.exit(1);
        }
    } else if (result.error) {
        console.error('Sign in error:', result.error);
        process.exit(1);
    }

    if (result.access_token) {
        console.log('TOKEN_START');
        console.log(result.access_token);
        console.log('TOKEN_END');
    } else {
        console.error('No access token returned');
        process.exit(1);
    }
    process.exit(0);
}

main().catch(console.error);
