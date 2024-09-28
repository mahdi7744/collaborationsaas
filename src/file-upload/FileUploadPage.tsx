import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { FaUpload, FaDownload, FaFileAlt, FaShareAlt, FaTrash } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';
import Modal from 'react-modal';
import { createFile, useQuery, getAllFilesByUser, getDownloadFileSignedURL, shareFileWithUsers } from 'wasp/client/operations';
import { deleteFile } from 'wasp/client/operations';



//import AnnotationComponent from './AnnotationComponent'; // Import the AnnotationComponent

interface File {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  type: string;
  size: number;
  sharedWith?: SharedFile[];
}

interface SharedFile {
  email: string;
}


Modal.setAppElement('#root');

const handleDelete = async (fileId: string) => {
  if (window.confirm('Are you sure you want to delete this file?')) {
    try {
      await deleteFile({ fileId }); // Pass only the fileId
      alert('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file', error);
      alert('Error deleting file');
    }
  }
};



export default function FileUploadPage() {
  const [fileToDownload, setFileToDownload] = useState<string>('');
  const [emailsToShareWith, setEmailsToShareWith] = useState<string>('');
  const [filterByShared, setFilterByShared] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  const { data: files = [], error: filesError, isLoading: isFilesLoading } = useQuery(getAllFilesByUser);
  const { isLoading: isDownloadUrlLoading, refetch: refetchDownloadUrl } = useQuery(
    getDownloadFileSignedURL,
    { key: fileToDownload },
    { enabled: false }
  );

  const history = useHistory();

  useEffect(() => {
    if (fileToDownload.length > 0) {
      refetchDownloadUrl()
        .then((urlQuery) => {
          if (urlQuery.status === 'success') {
            window.open(urlQuery.data, '_blank');
          }
        })
        .finally(() => setFileToDownload(''));
    }
  }, [fileToDownload]);

  const handleUpload = async (e: FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const file = formData.get('file-upload') as unknown as File;
      if (!file || !file.name || !file.type) {
        throw new Error('No file selected');
      }
  
      const fileType = file.type;
      const name = file.name;
  
      console.log('File selected:', { name, fileType });
  
      // Get the upload URL from the server
      const { uploadUrl, key } = await createFile({ fileType, name });
      if (!uploadUrl) {
        throw new Error('Failed to get upload URL');
      }
  
      console.log('Upload URL received:', uploadUrl);
  
      // Upload the file to S3
      const res = await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': fileType,
        },
      });
  
      console.log('S3 upload response:', res);
  
      if (res.status !== 200) {
        throw new Error('File upload to S3 failed');
      }
  
      alert('File uploaded successfully');
    } catch (error) {
      alert('Error uploading file. Please try again');
      console.error('Error uploading file', error);
    }
  };

  const handleFileShare = async () => {
    const emailsArray = emailsToShareWith.split(',').map(email => email.trim());

    for (const email of emailsArray) {
      try {
        for (const fileKey of selectedFiles) {
          await shareFileWithUsers({ fileKey, emails: [email] });
        }
        alert(`File shared with ${email} successfully`);
      } catch (error) {
        console.error(`Error sharing file with ${email}`, error);
        alert(`Error sharing file with ${email}`);
      }
    }
    setIsShareModalOpen(false);
  };

  const toggleFileSelection = (fileKey: string) => {
    setSelectedFiles((prevSelected) =>
      prevSelected.includes(fileKey)
        ? prevSelected.filter((key) => key !== fileKey)
        : [...prevSelected, fileKey]
    );
  };

  const filteredFiles = files.map((file: any) => ({
    ...file,
    sharedWith: file.sharedWith || []
  }))?.filter((file: File) => {
    return (
      (filterByShared ? (file.sharedWith && file.sharedWith.length > 0) : true) &&
      (searchTerm.length === 0 || file.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleAnnotate = (fileKey: string) => {
    history.push(`/annotate/${fileKey}`);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between mb-4 items-center">
        <h1 className="text-2xl font-bold">File Explorer</h1>
        <div className="space-x-4 flex items-center">
          <form onSubmit={handleUpload}>
            <input
              type="file"
              name="file-upload"
              className="hidden"
              id="file-upload"
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
            />
            <label htmlFor="file-upload" className="btn-primary flex items-center cursor-pointer">
              <FaUpload className="mr-2" /> Upload
            </label>
          </form>
          <button
            className="btn-secondary flex items-center"
            disabled={selectedFiles.length === 0}
            onClick={() => selectedFiles.forEach((fileKey) => setFileToDownload(fileKey))}
          >
            <FaDownload className="mr-2" /> Download
          </button>
          <button
            className="btn-secondary flex items-center"
            disabled={selectedFiles.length !== 1}
            onClick={() => handleAnnotate(selectedFiles[0])}
          >
            <FaFileAlt className="mr-2" /> Annotate/View
          </button>
          <button
            className="btn-secondary flex items-center"
            disabled={selectedFiles.length === 0}
            onClick={() => setIsShareModalOpen(true)}
          >
            <FaShareAlt className="mr-2" /> Share
          </button>
          <button
                  className="btn-danger flex items-center"
                  onClick={() => handleDelete(selectedFiles[0])}
                >
                  <FaTrash className="mr-2" /> Delete
                </button>
        </div>
      </div>

      <div className="flex mb-4 items-center">
        <input
          type="text"
          placeholder="Search files"
          className="input-primary w-full mr-2"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="btn-secondary" onClick={() => setFilterByShared(!filterByShared)}>
          {filterByShared ? 'Show All Files' : 'Show Shared Files'}
        </button>
      </div>

      {isFilesLoading ? (
        <p>Loading files...</p>
      ) : filesError ? (
        <p>Error loading files</p>
      ) : (
        <table className="table-auto w-full text-left">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Date</th>
              <th>Type</th>
              <th>Size</th>
              <th>Shared With</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles?.map((file: File) => (
              <tr key={file.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.key)}
                    onChange={() => toggleFileSelection(file.key)}
                  />
                </td>
                <td>{file.name}</td>
                <td>{new Date(file.createdAt).toLocaleDateString()}</td>
                <td>{file.type}</td>
                <td>{file.size} KB</td>
                <td>
                  {file.sharedWith && file.sharedWith.length > 0
                    ? file.sharedWith.map((share: SharedFile) => share.email).join(', ')
                    : 'N/A'}
                </td>
        
            </tr>
          ))}
        </tbody>
      </table>
    )}

<Modal
  isOpen={isShareModalOpen}
  onRequestClose={() => setIsShareModalOpen(false)}
  contentLabel="Share Files"
  className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-auto z-50"
  overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40"
>
  <h2 className="text-xl font-bold mb-4">Share Files</h2>
  <input
    type="text"
    placeholder="Enter emails separated by commas"
    value={emailsToShareWith}
    onChange={(e) => setEmailsToShareWith(e.target.value)}
    className="input-primary w-full mb-4"
  />
  <button className="btn-primary" onClick={handleFileShare}>
    Share
  </button>
</Modal>


     
    </div>
  );
}

function localDeleteFile(arg0: { fileKey: string; }, arg1: {}) {
  throw new Error('Function not implemented.');
}
