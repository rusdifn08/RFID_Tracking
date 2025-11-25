import { Container, Box, Typography } from '@mui/material';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-8">
      <Container maxWidth="lg">
        <Box className="text-center">
          <Typography variant="body1" className="mb-2">
            © {currentYear} Portfolio. Dibuat dengan ❤️ menggunakan React, TypeScript, Tailwind CSS 4, dan Material UI
          </Typography>
          <Typography variant="body2" className="text-gray-400">
            All rights reserved
          </Typography>
        </Box>
      </Container>
    </footer>
  );
};

export default Footer;

