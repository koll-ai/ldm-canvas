import React, { useState } from 'react';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { useSignInWithGoogle, useAuthState, useCreateUserWithEmailAndPassword, useSignInWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { auth } from './Auth';
import { GoogleLoginButton } from "react-social-login-buttons";
import TextField from '@mui/joy/TextField';

function SigninTabs() {
  const [key, setKey] = useState('login');
  const [signInWithGoogle, userGoogle, loadingGoogle, errorGoogle] = useSignInWithGoogle(auth);
  const [createUserWithEmailAndPassword,user,loading,error ] = useCreateUserWithEmailAndPassword(auth);
  const [emailCreate, setEmailCreate] = useState('');
  const [passwordCreate, setPasswordCreate] = useState('');
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [pseudoCreate, setPseudoCreate] = useState('');

  const BACK_BASE_URL = process.env.REACT_APP_BACK_URL;

  function registerUserfromMail(email, password, pseudo){
    createUserWithEmailAndPassword(email, password)
    if(! error){
        fetch(BACK_BASE_URL + "register_from_email/", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(
                {
                    'email' : email,
                    'pseudo': pseudo
                }
            ),
        })
    }
  }

  function registerUserfromGoogle(email){
    signInWithGoogle().then
    if(! error){
        fetch(BACK_BASE_URL + "register_from_google/", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(
                {
                    'email' : email,
                }
            ),
        })
    }
  }

  return (
    <Tabs
      id="controlled-tab-example"
      activeKey={key}
      onSelect={(k) => setKey(k)}
      className="mb-3"
    >
      <Tab eventKey="login" title="Login">
          <GoogleLoginButton onClick={() => registerUserfromGoogle(pseudoCreate)} />
          <TextField
            type="email"
            label="Email"
            value={emailLogin}
            onChange={(e) => setEmailLogin(e.target.value)}
            placeholder="user@domain.com"
        />
        <br/>
        <TextField 
            type="password"
            label="Password"
            value={passwordLogin}
            onChange={(e) => setPasswordLogin(e.target.value)}
            placeholder="password"
        />
      </Tab>
      <Tab eventKey="createAccount" title="Create Account">
        <TextField
            type="email"
            label="Email"
            value={emailCreate}
            onChange={(e) => setEmailCreate(e.target.value)}
            placeholder="user@domain.com"
        />
        <br/>
        <TextField 
            type="password"
            label="Password"
            value={passwordCreate}
            onChange={(e) => setPasswordCreate(e.target.value)}
            placeholder="password"
        />
        <br/>
        <TextField 
            label="Pseudo"
            value={pseudoCreate}
            onChange={(e) => setPseudoCreate(e.target.value)}
            placeholder="pseudo"
        />
        <button onClick={() => registerUserfromMail(emailCreate, passwordCreate, pseudoCreate)}>
        Register
      </button>
        
      </Tab>
    </Tabs>
  );
}

export default SigninTabs;