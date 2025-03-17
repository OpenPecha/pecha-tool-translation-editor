import React, { useState } from 'react';
import { updatePermission } from "../api/document";
import { useAuth } from '../contexts/AuthContext';
import { FaShare } from "react-icons/fa";
function Permissions({ documentId }) {
    const [showModal, setShowModal] = useState(false);
    const [error,setError] = useState(null);
    const [email, setEmail] = useState("");
    const [canRead, setCanRead] = useState(false);
    const [canWrite, setCanWrite] = useState(false);

    const handleGrantPermission = async () => {
        try {
            let canread=canRead?"true":"false";
            let canwrite=canWrite?"true":"false";
            const response = await updatePermission(documentId, email, canread, canwrite);
            if (response) {
                if(response.error) {
                    setError(response.error)
                }else{
                    console.log("Permission updated successfully:", response);
                    setShowModal(false);
                    setError(null)
                    setEmail("");
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <span>
            {/* Grant Permission Button */}
            <button onClick={() => setShowModal(true)} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition">
            <span className="flex items-center gap-2">
                 <FaShare /> Share
                </span>
            </button>

            {/* Permission Modal */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                        <h3 className="text-lg font-semibold mb-4">Grant Permission</h3>
                        <input
                            type="email"
                            placeholder="User Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border p-2 rounded-md mb-4"
                        />
                        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                checked={canRead}
                                onChange={(e) => setCanRead(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <label className="text-gray-700">Can Read</label>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                checked={canWrite}
                                onChange={(e) => setCanWrite(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <label className="text-gray-700">Can Write</label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={handleGrantPermission} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition">
                                Submit
                            </button>
                            <button onClick={() => 
            {setShowModal(false)
            setEmail("")
            setError(null)
            }
            } className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </span>
    );
}

export default Permissions;