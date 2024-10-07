import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { FaUpload, FaDownload, FaFileAlt, FaShareAlt, FaTrash } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';
import Modal from 'react-modal';
import { createFile, useQuery, getAllFilesByUser, getDownloadFileSignedURL, shareFileWithUsers, deleteFile } from 'wasp/client/operations';
import useColorMode from '../client/hooks/useColorMode'; // Import the color mode hook
import { useAuth } from 'wasp/client/auth';// Import useAuth



interface File {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  type: string;
  size: number;
  userId: string; // Add userId property


  sharedWith?: SharedFile[];
}
interface SharedFile {
  sharedWith: {
    email: string;
  };
  sharedBy: {
    email: string;
  };
}

Modal.setAppElement('#root');
// Helper function to format file sizes
const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024) return sizeInBytes + ' bytes';
  const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024));
  const size = (sizeInBytes / Math.pow(1024, i)).toFixed(2);
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
  return `${size} ${units[i]}`;
};

export default function FileUploadPage() {


  const [fileToDownload, setFileToDownload] = useState<string>('');
  const [emailsToShareWith, setEmailsToShareWith] = useState<string>('');
  const [filterByShared, setFilterByShared] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [sharedFilesList, setSharedFilesList] = useState<string[]>([]);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState<boolean>(false);
  const [colorMode] = useColorMode(); // Get the current color mode

  const { data: currentUser } = useAuth();
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
      const size = file.size; // Extract file size

      const formattedSize = formatFileSize(size); // Format file size

      console.log('File selected:', { name, fileType, size: formattedSize });

      // Get the upload URL from the server
      const { uploadUrl, key } = await createFile({ fileType, name, size }); // Send raw size to the server
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

      alert(`File uploaded successfully `); // Display formatted size in alert
    } catch (error) {
      alert('Error uploading file. Please try again');
      console.error('Error uploading file', error);
    }
  };




  const handleDelete = async (fileKey: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteFile({ fileId: fileKey }); // Ensure this matches your API expectations
        setSelectedFiles((prevSelected) => prevSelected.filter(key => key !== fileKey)); // Remove deleted file from selected files
        alert('File deleted successfully');
      } catch (error) {
        console.error('Error deleting file', error);
        alert('Error deleting file');
      }
    }
  };


  const handleFileShare = async () => {
    const emailsArray = emailsToShareWith.split(',').map(email => email.trim());

    // Gather the names of the selected files for display
    const sharedFiles = selectedFiles.map(fileKey => {
      const file = files.find(f => f.key === fileKey);
      return file ? file.name : '';
    });

    try {
      // Share each selected file with all provided emails at once
      for (const fileKey of selectedFiles) {
        await shareFileWithUsers({ fileKey, emails: emailsArray });
      }

      // Trigger the job to send email notifications after sharing files
      await fetch('/send-shared-file-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: emailsArray,
          sharedFiles: sharedFiles,
        }),
      });

      // Set the shared file list and open confirmation modal
      setSharedFilesList(sharedFiles);
      setIsShareModalOpen(false);
      setIsConfirmationModalOpen(true);

    } catch (error) {
      // Extract error message from the server
      const errorMessage = (error as any)?.response?.data?.message || 'An error occurred while sharing files.';
      alert(errorMessage); // Display the error message to the user
      console.error('Error sharing files:', error);
    }
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
  })).filter((file: File) => {
    console.log('file.sharedWith:', file.sharedWith); // Log the structure of file.sharedWith
    return (
      (filterByShared ? (file.sharedWith && file.sharedWith.length > 0) : true) &&
      (searchTerm.length === 0 || file.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Modify the way shared emails are displayed to avoid redundancy
  const uniqueSharedEmails = (sharedWith: SharedFile[]) => {
    const uniqueEmails = new Set<string>();
    sharedWith.forEach(share => uniqueEmails.add(share.sharedWith.email));
    return Array.from(uniqueEmails).join(', ');
  };

  const handleAnnotate = (fileKey: string) => {
    history.push(`/annotate/${fileKey}`);
  };

  const getFileExtension = (filename: string) => {
    const parts = filename.split('.');
    return parts.length > 1 ? `${parts.pop()}` : '';
  };



  return (
    <div className={`container mx-auto p-6 ${colorMode === 'dark' ? 'bg-gray-900 text-gray-200' : 'bg-white text-black'}`}>
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
            disabled={selectedFiles.length === 0}
            onClick={() => {
              if (selectedFiles.length === 1) {
                handleDelete(selectedFiles[0]);
              } else {
                alert('Please select only one file to delete at a time.');
              }
            }}
          >
            <FaTrash className="mr-2" /> Delete
          </button>
        </div>
      </div>

      <div className="flex mb-4 items-center">
        <input
          type="text"
          placeholder="Search files"
          className="input-primary w-full mr-2 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring focus:ring-blue-500"
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
        <table className={`table-auto w-full text-left border border-gray-300 rounded-lg shadow-md ${colorMode === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-black'}`}>
          <thead>
            <tr className={`bg-gray-700 ${colorMode === 'dark' ? 'text-gray-200' : 'bg-gray-200'}`}>
              <th></th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Shared With</th>
              <th className="px-4 py-2">Shared With Me</th> {/* Add the new column here */}
            </tr>
          </thead>
          <tbody>
            {filteredFiles?.map((file: File) => (
              <tr key={file.id} className={`hover:bg-gray-600 ${colorMode === 'dark' ? 'bg-gray-700' : ''}`}>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.key)}
                    onChange={() => toggleFileSelection(file.key)}
                  />
                </td>

                <td className="px-4 py-2">{file.name}</td>
                <td className="px-4 py-2">{new Date(file.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2">{getFileExtension(file.name)}</td>
                <td className="px-4 py-2">{formatFileSize(file.size)}</td>
               {/* "Shared By Me" column */}
               <td className="px-4 py-2">
  {file.sharedWith && currentUser && file.userId === currentUser.id // Check if the file was uploaded by the current user
    ? uniqueSharedEmails(file.sharedWith) // Use the helper function to avoid redundancy
    : '-'} {/* Display '-' if no users were shared */}
</td>

{/* "Shared With Me" column */}
<td className="px-4 py-2">
  {file.sharedWith && currentUser && file.userId !== currentUser.id // Check if the file was shared with the current user (not uploaded by them)
    ? file.sharedWith.find(s => s.sharedWith.email === currentUser.email)?.sharedBy?.email // Display the email of the user who shared the file
    : '-'} {/* Display '-' if the file wasn't shared with the current user */}
</td>




              </tr>
            ))}
          </tbody>
        </table>

      )}

      {/* Share Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onRequestClose={() => setIsShareModalOpen(false)}
        contentLabel="Share Files"
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50"
      >
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg w-96">
          <h2 className="text-lg font-bold text-gray-200">Share Files</h2>
          <p>Selected Files:</p>
          <ul>
            {selectedFiles.map(fileKey => {
              const file = files.find(f => f.key === fileKey);
              return file ? <li key={fileKey} className="text-gray-200">{file.name}</li> : null;
            })}
          </ul>
          <input
            type="text"
            placeholder="Enter emails separated by commas"
            value={emailsToShareWith}
            onChange={(e) => setEmailsToShareWith(e.target.value)}
            className="input-primary w-full mb-2 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring focus:ring-blue-500"
          />
          <button onClick={handleFileShare} className="btn-primary w-full">
            Share
          </button>
          <button onClick={() => setIsShareModalOpen(false)} className="mt-2 text-center text-gray-500">
            Cancel
          </button>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmationModalOpen}
        onRequestClose={() => setIsConfirmationModalOpen(false)}
        contentLabel="Shared Files Confirmation"
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50"
      >
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg w-96">
          <h2 className="text-lg font-bold text-gray-200">Files Shared Successfully!</h2>
          <p>Files shared:</p>
          <ul>
            {sharedFilesList.map(file => (
              <li key={file} className="text-gray-200">{file}</li>
            ))}
          </ul>
          <p>With:</p>
          <ul>
            {emailsToShareWith.split(',').map(email => (
              <li key={email.trim()} className="text-gray-200">{email.trim()}</li>
            ))}
          </ul>
          <button onClick={() => setIsConfirmationModalOpen(false)} className="btn-primary w-full">
            Close
          </button>
        </div>
      </Modal>
    </div>
  );

}  