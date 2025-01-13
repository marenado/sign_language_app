import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";

const Sidebar = () => {
  return (
    <SidebarContainer>
      <SidebarItem>Dictionary</SidebarItem>
      <SidebarItem>Modules</SidebarItem>
      <SidebarItem>Settings</SidebarItem>
      <SidebarItem style={{ color: "red", cursor: "pointer" }}>Log Out</SidebarItem>
    </SidebarContainer>
  );
};

const ModuleManagement = () => {
  const [modules, setModules] = useState([]);
  const [moduleData, setModuleData] = useState({
    title: "",
    description: "",
    version: 1,
    prerequisite_mod: null,
  });

  // Fetch all modules
  const fetchModules = async () => {
    try {
      const res = await axios.get("/admin/modules", {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      setModules(res.data);
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  };

  // Handle module creation
  const createModule = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/admin/modules", moduleData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      fetchModules(); // Refresh modules after creation
      setModuleData({ title: "", description: "", version: 1, prerequisite_mod: null }); // Reset form
    } catch (error) {
      console.error("Error creating module:", error);
    }
  };

  // Handle module deletion
  const deleteModule = async (moduleId) => {
    try {
      await axios.delete(`/admin/modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      fetchModules(); // Refresh modules after deletion
    } catch (error) {
      console.error("Error deleting module:", error);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return (
    <PageContainer>
      <Sidebar />
      <MainContent>
        <Header>
          <h1>Module Management</h1>
          <AddModuleButton>Add Module +</AddModuleButton>
        </Header>
        <Content>
          <ModuleList>
            {modules.map((module) => (
              <ModuleCard key={module.module_id}>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <p>Version: {module.version}</p>
                <DeleteButton onClick={() => deleteModule(module.module_id)}>Delete</DeleteButton>
              </ModuleCard>
            ))}
          </ModuleList>
        </Content>
      </MainContent>
    </PageContainer>
  );
};

export default ModuleManagement;

const PageContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: #f9f9f9;
`;

const SidebarContainer = styled.div`
  width: 250px;
  background-color: #6a1b9a;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
`;

const SidebarItem = styled.div`
  margin: 20px 0;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #ddd;
`;

const AddModuleButton = styled.button`
  padding: 10px 20px;
  background-color: #6a1b9a;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background-color: #4a148c;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #ffffff;
`;

const ModuleList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
`;

const ModuleCard = styled.div`
  background-color: #e3f2fd;
  border-radius: 5px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 250px;
`;

const DeleteButton = styled.button`
  padding: 10px;
  background-color: #e57373;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background-color: #c62828;
  }
`;
