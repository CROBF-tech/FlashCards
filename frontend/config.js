const DEV_API_URL = 'http://192.168.100.5:8000';
const PROD_API_URL = 'https://flash-cards-orcin-omega.vercel.app';

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export const CONFIG = {
    tokenStorageKey: 'flashcards_token',
    tokenHeaderKey: 'x-auth-token',
};
