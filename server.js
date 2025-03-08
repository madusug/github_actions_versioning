const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Use EB's port (8080) or 3000 locally

// Serve static files from the "public" directory
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
