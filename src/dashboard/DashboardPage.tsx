// src/dashboard/DashboardPage.tsx

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";
import "./DashboardStyles.css";

const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]); // Placeholder for projects data
  const [clients, setClients] = useState<any[]>([]);   // Placeholder for clients data

  useEffect(() => {
    // Fetch projects and clients (this would be API calls in a real app)
    setProjects([{ id: 1, name: "Project A" }, { id: 2, name: "Project B" }]);
    setClients([{ id: 1, name: "Client X" }, { id: 2, name: "Client Y" }]);
  }, []);

  return (
    <div className="dashboard-container">
      <DashboardSidebar />
      <div className="dashboard-content">
        <h1>Dashboard</h1>
        <div>
          <h2>Projects</h2>
          <ul>
            {projects.map((project) => (
              <li key={project.id}>
                <Link to={`/session/${project.id}`}>{project.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Clients</h2>
          <ul>
            {clients.map((client) => (
              <li key={client.id}>
                <Link to={`/session/${client.id}`}>{client.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
