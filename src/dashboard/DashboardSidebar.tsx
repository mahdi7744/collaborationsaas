// src/dashboard/DashboardSidebar.tsx

import React from "react";
import { Link } from "react-router-dom";

const DashboardSidebar: React.FC = () => {
  return (
    <div className="sidebar">
      <h2>Navigation</h2>
      <ul>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/file-upload">File Upload</Link></li>
        <li><Link to="/settings">Settings</Link></li>
      </ul>
    </div>
  );
};

export default DashboardSidebar;
