import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand flex items-center gap-3">
        <img src='/icon/icon.png' width={20} className='object-content'/>
        <Link to="/">Pecha Editor</Link>
      </div>
      <div className="navbar-menu">
        {currentUser ? (
          <>
            <span className="navbar-username">Hi, {currentUser.username}</span>
            <button className="btn btn-logout" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-login">Login</Link>
            <Link to="/register" className="btn btn-register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;