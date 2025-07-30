// Small Node.js script to hash a password
const bcrypt = require('bcryptjs');
async function hashPassword() {
    const password = 'jared';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(hashedPassword);
}
hashPassword();