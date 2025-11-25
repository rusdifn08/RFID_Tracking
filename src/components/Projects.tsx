import { useState } from 'react';
import { Container, Box, Grid, Card, CardContent, CardMedia, Typography, Chip, Button, Alert } from '@mui/material';
import { GitHub, Launch, Image as ImageIcon } from '@mui/icons-material';

const Projects = () => {
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const handleImageError = (index: number) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  const projects = [
    {
      title: 'E-Commerce Platform',
      description: 'Platform e-commerce modern dengan fitur pembayaran, keranjang belanja, dan manajemen produk',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      technologies: ['React', 'TypeScript', 'Node.js', 'MongoDB'],
      github: '#',
      demo: '#',
    },
    {
      title: 'Task Management App',
      description: 'Aplikasi manajemen tugas dengan drag & drop, real-time updates, dan kolaborasi tim',
      image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800',
      technologies: ['React', 'TypeScript', 'Firebase', 'Material UI'],
      github: '#',
      demo: '#',
    },
    {
      title: 'Portfolio Website',
      description: 'Website portfolio responsif dengan animasi modern dan desain yang menarik',
      image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800',
      technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
      github: '#',
      demo: '#',
    },
    {
      title: 'Social Media Dashboard',
      description: 'Dashboard analitik untuk media sosial dengan visualisasi data dan insights',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
      technologies: ['React', 'TypeScript', 'Chart.js', 'REST API'],
      github: '#',
      demo: '#',
    },
    {
      title: 'Weather App',
      description: 'Aplikasi cuaca dengan prediksi 7 hari, peta interaktif, dan notifikasi',
      image: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800',
      technologies: ['React', 'TypeScript', 'OpenWeather API', 'PWA'],
      github: '#',
      demo: '#',
    },
    {
      title: 'Learning Management System',
      description: 'Sistem manajemen pembelajaran dengan video streaming, quiz, dan sertifikat',
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
      technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
      github: '#',
      demo: '#',
    },
  ];

  return (
    <section id="projects" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <Container maxWidth="lg">
        <Box className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Proyek <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Saya</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Beberapa proyek terbaik yang telah saya kembangkan dengan teknologi modern
          </p>
        </Box>

        <Grid container spacing={4}>
          {projects.map((project, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card className="h-full hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden group">
                {imageErrors[index] ? (
                  <Box
                    className="h-[200px] bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center"
                  >
                    <ImageIcon className="text-6xl text-gray-400" />
                  </Box>
                ) : (
                  <CardMedia
                    component="img"
                    height="200"
                    image={project.image}
                    alt={project.title}
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={() => handleImageError(index)}
                  />
                )}
                <CardContent className="p-6">
                  <Typography variant="h5" className="font-bold text-gray-900 mb-2">
                    {project.title}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 mb-4 min-h-[60px]">
                    {project.description}
                  </Typography>
                  
                  <Box className="flex flex-wrap gap-2 mb-4">
                    {project.technologies.map((tech, techIndex) => (
                      <Chip
                        key={techIndex}
                        label={tech}
                        size="small"
                        className="bg-blue-100 text-blue-700 font-medium"
                      />
                    ))}
                  </Box>

                  <Box className="flex gap-2">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<GitHub />}
                      className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50"
                      href={project.github}
                      target="_blank"
                    >
                      Code
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Launch />}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      href={project.demo}
                      target="_blank"
                    >
                      Demo
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </section>
  );
};

export default Projects;

