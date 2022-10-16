import React, { useState } from "react";
import CoordsModal from './coordsModal'
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import {useSignInWithGoogle} from 'react-firebase-hooks/auth'
import { auth } from "./auth/Auth";
import * as requests from './requests'
import { logout } from "./auth/Auth";
import SignInModalButton from "./auth/signinModal";
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';

const SideBar = props => {
    const sidebarClass = props.isOpen ? "sidebar open" : "sidebar";

    let camera = props.camera;
    let room = "default";

    const [logged, setLogged] = useState(false);
    const [user, loading, error] = useAuthState(auth);
    

    return (
        <div className={sidebarClass}>
            {/* <div className="coords"> {Math.floor(props.camera.x)}, {Math.floor(props.camera.y)}, {Math.floor(props.camera.zoom * 100)} </div> */}

            <CoordsModal
                x={Math.round(camera.x)}
                y={Math.round(camera.y)}
                zoom={Math.round(camera.zoom * 100)}
                room={room}
            />

            <button onClick={props.toggleSidebar} className="sidebar-toggle">
                {props.isOpen ? ">" : "<"}
            </button>

            {false &&
                <>
                    <h4> Steps </h4>
                    <input type="range" name="vol" min="0" max="50" />

                    <h4> Guidance scale </h4>
                    <input type="range" name="vol" min="0" max="50" />

                    <h4> Seed </h4>
                    <input type="text" />

                    <h4> Image Ratio </h4>
                    <input type="range" name="vol" min="0" max="100" />

                </>
            }

            <h4> Prompt modifiers </h4>
            <textarea
                placeholder="digital art, high resolution"
                rows="5"
                onChange={e => props.setModifiers(e.target.value)}
                className="modifiersTextArea"
            ></textarea>

            <h4>Last images</h4>

            <div className="history">
                <table>
                    {props.history.map((data) => {
                        var z = Math.min(props.canvasMeta.w / +data.width, props.canvasMeta.h / +data.height) * 0.5;
                        var x = +data.posX - (props.canvasMeta.w / 2) / z + +data.width / 2
                        var y = +data.posY - (props.canvasMeta.h / 2) / z + +data.height / 2

                        return (
                            <tr className={"histLine"}>
                                <td onClick={() => { camera.move(x, y, z) }}>{data.prompt}</td>
                            </tr>
                        )
                    })
                    }
                </table>
            </div>

            <h4>Parameters</h4>
            <button onClick={() => console.log(error)}>check user</button>
            {/* <button onClick={() => signInWithGoogle()}>signinwithgoogle</button>
            <button onClick={() => logout()}>logout</button> */}
            
            {!user ? (
                    <SignInModalButton user={user}/>
                
            ) : (
                <button onClick={() => {
                    logout()
                }}> Logout </button>
            )}


        </div>
    );
};
export default SideBar;
