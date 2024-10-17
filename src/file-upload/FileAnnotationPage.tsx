import React from 'react';
import { useParams } from 'react-router-dom';

const FileAnnotationPage = () => {
  const { fileKey } = useParams<{ fileKey: string }>(); // Get the file key from the URL

  return (
    <div>
      <h1>Annotating File: {fileKey}</h1>
      {/* Add your annotation logic here */}
    </div>
  );
};

export default FileAnnotationPage; // Make sure it's a default export
