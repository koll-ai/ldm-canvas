import { initializeApp } from "firebase/app";
import {
    GoogleAuthProvider,
    getAuth,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
} from "firebase/auth";

export const firebaseConfig = {
    apiKey: "AIzaSyApc_Q01mz-RNVtxwvtcxF5WhAOk8M6OEg",
    authDomain: "ai-canvas.firebaseapp.com",
    projectId: "ai-canvas",
    storageBucket: "ai-canvas.appspot.com",
    messagingSenderId: "732264051436",
    appId: "1:732264051436:web:95cb2c7c6bb56099502bc9"
};

const BACK_BASE_URL = process.env.REACT_APP_BACK_URL;

console.log('hello from auth')
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const signInWithGoogle = async () => {
    try {
        console.log('coucou')
        const res = await signInWithPopup(auth, googleProvider);
        const user = res.user;
        console.log(res)
        console.log(user)
        fetch(BACK_BASE_URL + "/register_from_google/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(
                {
                    'credential': res._tokenResponse.idToken
                }
            ),
        })
        console.log(res)
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};

const logInWithEmailAndPassword = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};
const registerWithEmailAndPassword = async (name, email, password) => {
    try {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const user = res.user;
        console.log(user)
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};
const sendPasswordReset = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Password reset link sent!");
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};
const logout = () => {
    signOut(auth);
};
export {
    auth,
    signInWithGoogle,
    logInWithEmailAndPassword,
    registerWithEmailAndPassword,
    sendPasswordReset,
    logout,
};
