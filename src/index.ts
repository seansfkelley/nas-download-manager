import { login } from './api';
import { USERNAME, PASSWORD } from './secrets';

console.log('running index script...')

login(USERNAME, PASSWORD);
