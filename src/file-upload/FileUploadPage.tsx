import React, { useState, useEffect, FormEvent } from 'react';
import { FaUpload, FaDownload, FaFolder, FaFileAlt, FaShareAlt, FaTrash, FaPlus, FaPencilAlt, FaSearch } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import { createFile, useQuery, getAllProjectsByUser, getDownloadFileSignedURL, getAllFilesByUser, deleteFile, createNewProject, deleteProject, renameProject } from 'wasp/client/operations';
import { cn } from '../client/cn'; // Tailwind merging function
import clsx from 'clsx'; // For conditional class handling
import useColorMode from '../client/hooks/useColorMode';
import { useHistory } from 'react-router-dom';

// File and Project Types
type File = {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  type: string;
  size: number;
  projectId?: string;
  userId: string;
  originalSenderEmail?: string;
  sharedWith?: { sharedWith: { email: string }, sharedBy: { email: string } }[];
};

type Project = {
  id: string;
  name: string;
  createdAt: string;
};

// Utility for formatting file sizes
const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024) return sizeInBytes + ' bytes';
  const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024));
  const size = (sizeInBytes / Math.pow(1024, i)).toFixed(2);
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
  return `${size} ${units[i]}`;
};

export default function Dashboard() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [emailsToShareWith, setEmailsToShareWith] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProjectDeleteModalOpen, setIsProjectDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [fileToDelete, setFileToDelete] = useState<File | null>(null);
  const [colorMode] = useColorMode(); // Get color mode
  const history = useHistory(); // Initialize history for navigation
  // Query for fetching files and projects
  const { data: filesData, isLoading: isFilesLoading, error: filesError, refetch: refetchFiles } = useQuery(getAllFilesByUser);
  const { data: projectsData, isLoading: isProjectsLoading, error: projectsError, refetch: refetchProjects } = useQuery(getAllProjectsByUser);

  useEffect(() => {
    if (projectsData) {
      setProjects(projectsData.map((project: { id: string; name: string; createdAt: Date }) => ({ ...project, createdAt: new Date(project.createdAt).toISOString() })));
    }
  }, [projectsData]);

  // Handle project creation
  const handleCreateProject = async () => {
    try {
      const newProject = await createNewProject({ name: newProjectName });
      setProjects((prev) => [...prev, { ...newProject, createdAt: new Date(newProject.createdAt).toISOString() }]);
      setIsProjectModalOpen(false);
      setNewProjectName('');
      refetchProjects();
    } catch (error) {
      console.error('Error creating project', error);
    }
  };

  // Handle project renaming
  const handleRenameProject = async (projectId: string) => {
    if (!editingProject || !newProjectName.trim()) return;
    try {
      await renameProject({ projectId, newName: newProjectName });
      setProjects((prev) => prev.map((proj) => (proj.id === projectId ? { ...proj, name: newProjectName } : proj)));
      setEditingProject(null);
      setNewProjectName('');
      refetchProjects();
    } catch (error) {
      console.error('Error renaming project', error);
    }
  };


  // Trigger modal for confirming project deletion
  const confirmDeleteProject = (project: Project) => {
    console.log('Opening modal for project:', project); // Log the project object
    setProjectToDelete(project); // Set the project object to access its name and id
    setIsProjectDeleteModalOpen(true); // Open the project deletion modal
  };

  // Handle project deletion after confirmation
  const handleDeleteProject = async () => {
    if (projectToDelete) {
      console.log('Attempting to delete project with ID:', projectToDelete.id); // Log the project ID
      try {
        await deleteProject({ projectId: projectToDelete.id }); // Delete project by ID

        console.log('Project deleted successfully'); // Log success
        setProjects((prev) => prev.filter((proj) => proj.id !== projectToDelete.id)); // Update project list

        // Reset the state
        setProjectToDelete(null);
        setSelectedProject(null); // Deselect the project
        setIsProjectDeleteModalOpen(false); // Close the deletion modal

        refetchProjects(); // Refetch the projects to update the list
      } catch (error) {
        console.error('Error deleting project:', error); // Log the error
        alert('Error deleting project. Please try again.');
      }
    } else {
      console.error('No project selected for deletion'); // Log if projectToDelete is null
    }
  };


  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile({
        id: '',
        key: '',
        name: file.name,
        createdAt: new Date().toISOString(),
        type: file.type,
        size: file.size,
        userId: '',
      });
      setIsUploadModalOpen(true);
    }
  };

  const handleUploadConfirm = async () => {
    if (!uploadFile || !selectedProject) return;

    try {
      const { uploadUrl, key } = await createFile({
        fileType: uploadFile.type,
        name: uploadFile.name,
        size: uploadFile.size,
        projectId: selectedProject.id,
      });

      if (!uploadUrl) {
        throw new Error('Failed to get upload URL');
      }

      const formData = new FormData();
      formData.append('file', uploadFile as unknown as Blob);

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      setIsUploadModalOpen(false);
      setUploadFile(null);
      refetchFiles();
      alert('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    }
  };

  const handleFileDelete = async (file: File) => {
    console.log('Attempting to delete file with ID:', file.id); // Add logging to check if fileId is correct
    setFileToDelete(file);
    setIsDeleteModalOpen(true); // Trigger the modal for file deletion confirmation
  };

  const confirmDeleteFile = async () => {
    if (fileToDelete) {
      try {
        await deleteFile({ fileId: fileToDelete.id }); // Use fileId to delete the file
        setSelectedFiles((prevSelected) => prevSelected.filter(id => id !== fileToDelete.id)); // Remove the file from selected list
        refetchFiles(); // Refetch the file list after deletion
        setIsDeleteModalOpen(false); // Close the modal
        setFileToDelete(null); // Reset fileToDelete
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Error deleting file. Please try again.');
      }
    }
  };
  

  // Handle annotation navigation
  const handleAnnotate = (fileKey: string) => {
    if (fileKey) {
      console.log(`Navigating to annotation page for file with key: ${fileKey}`);
      history.push(`/file-annotation/${fileKey}`); // Navigate to the annotation page using fileKey
    }
  }; 
  
  const handleFileDownload = async (fileKey: string) => {
    try {
      const downloadUrl = await getDownloadFileSignedURL({ key: fileKey });
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        throw new Error('Failed to get download URL');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  // Filter files based on selected project and search term
  const filteredFiles = filesData
    ?.map((file: any) => ({
      ...file,
      createdAt: new Date(file.createdAt).toISOString(),
    }))
    .filter((file: File) => file.projectId === selectedProject?.id && file.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  return (
    <div className={`container mx-auto p-6 ${cn('min-h-screen', colorMode === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100')}`}>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">File Annotation Dashboard</h1>
      </header>

      <div className="flex space-x-4 mb-8">
        <div className="w-1/4 bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Projects</h2>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
            >
              <FaPlus />
            </button>
          </div>
          <div className="space-y-2">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedProject?.id === project.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                onClick={() => setSelectedProject(project)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center text-gray-800 dark:text-black-200">
                  <FaFolder className="mr-2 text-blue-500" />
                  {project.name}
                </span>

                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProject(project);
                    }}
                    className="text-gray-500 hover:text-blue-500 mr-2"
                  >
                    <FaPencilAlt />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDeleteProject(project);
                    }}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <FaTrash />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="w-3/4 bg-white rounded-lg shadow-md p-4">
          {selectedProject ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700">Files in {selectedProject.name}</h2>
                <div className="flex space-x-2">
                  <label className="btn-primary text-black flex items-center cursor-pointer">
                    <FaUpload className="mr-2" /> Upload A New File
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>

                </div>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search files"
                    className="w-full pl-10 pr-4 py-2 border rounded-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              {isFilesLoading ? (
                <p>Loading files...</p>
              ) : filesError ? (
                <p>Error loading files</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredFiles.map((file: File) => (
                        <motion.tr
                          key={file.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        ><td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{file.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">{file.name.split('.').pop()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatFileSize(file.size)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">

                            <button
                              className="text-blue-600 hover:text-blue-900 mr-2"
                              onClick={() => handleAnnotate(file.key)} // Correct usage of handleAnnotate
                            >
                              <FaFileAlt /> Annotate
                            </button>
                            <button
                              className="text-green-600 hover:text-green-900 mr-2"
                              onClick={() => handleFileDownload(file.key)}
                            >
                              <FaDownload /> Download
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleFileDelete(file)}
                            >
                              <FaTrash /> Delete
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-gray-500">Select a project to view files</p>
          )}
        </div>
      </div>

      {/* Project and File Modals */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <Dialog
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 overflow-y-auto"
            open={isProjectModalOpen}
            onClose={() => setIsProjectModalOpen(false)}
          >
            <div className="min-h-screen px-4 text-center">
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
              <motion.div
                className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Create New Project
                </Dialog.Title>
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Project Name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={() => setIsProjectModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={handleCreateProject}
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProjectDeleteModalOpen && (
          <Dialog
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 overflow-y-auto"
            open={isProjectDeleteModalOpen}
            onClose={() => setIsProjectDeleteModalOpen(false)}
          >
            <div className="min-h-screen px-4 text-center">
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
              <motion.div
                className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Confirm Deletion
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete the project <span className="font-bold">{projectToDelete?.name}</span>? This action cannot be undone.
                  </p>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={() => setIsProjectDeleteModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                    onClick={handleDeleteProject}
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <Dialog
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 overflow-y-auto"
            open={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
          >
            <div className="min-h-screen px-4 text-center">
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
              <motion.div
                className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Confirm Deletion
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete the file <span className="font-bold">{fileToDelete?.name}</span>? This action cannot be undone.
                  </p>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={() => setIsDeleteModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                    onClick={confirmDeleteFile}
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Other modals (Upload, Share) */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <Dialog
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 overflow-y-auto"
            open={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
          >
            <div className="min-h-screen px-4 text-center">
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
              <motion.div
                className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Upload File
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to upload {uploadFile?.name}?
                  </p>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={() => setIsUploadModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={handleUploadConfirm}
                  >
                    Upload
                  </button>
                </div>
              </motion.div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
