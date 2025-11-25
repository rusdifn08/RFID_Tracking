import { Button, Box, Container } from '@mui/material';
import { Download, Email } from '@mui/icons-material';

const Hero = () => {
  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply blur-xl opacity-30" style={{ animation: 'blob 7s infinite' }}></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply blur-xl opacity-30" style={{ animation: 'blob 7s infinite 2s' }}></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply blur-xl opacity-30" style={{ animation: 'blob 7s infinite 4s' }}></div>
      </div>

      <Container maxWidth="lg" className="relative z-10">
        <Box className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">
              Halo, Saya{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Web Developer
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
              Membuat pengalaman web yang menarik dan fungsional dengan teknologi modern
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              variant="contained"
              size="large"
              startIcon={<Email />}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              onClick={() => {
                const element = document.querySelector('#contact');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Hubungi Saya
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Download />}
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-full transition-all duration-300"
            >
              Download CV
            </Button>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2" style={{ animation: 'bounce 2s infinite' }}>
            <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-gray-400 rounded-full mt-2"></div>
            </div>
          </div>
        </Box>
      </Container>
    </section>
  );
};

export default Hero;

