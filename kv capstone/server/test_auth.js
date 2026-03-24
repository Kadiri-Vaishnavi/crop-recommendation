
const axios = require('axios');

async function testAuth() {
    try {
        console.log('Testing server health...');
        const health = await axios.get('http://localhost:5000/api/health');
        console.log('Health:', health.data);

        console.log('\nTesting registration...');
        const reg = await axios.post('http://localhost:5000/api/auth/register', {
            name: 'Test User',
            email: 'test' + Date.now() + '@example.com',
            password: 'Password123',
            region: 'Test Land'
        });
        console.log('Register Success:', reg.data.success);
        
        const token = reg.data.token;
        console.log('\nTesting /me protected route...');
        const me = await axios.get('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Me Success:', me.data.success, 'User:', me.data.user.name);

    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

testAuth();
