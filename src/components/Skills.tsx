import { Container, Box, Grid, Card, CardContent, Typography, LinearProgress, Chip } from '@mui/material';

const Skills = () => {
  const skillCategories = [
    {
      category: 'Frontend',
      skills: [
        { name: 'React', level: 90 },
        { name: 'TypeScript', level: 85 },
        { name: 'Tailwind CSS', level: 88 },
        { name: 'Material UI', level: 85 },
        { name: 'Next.js', level: 80 },
      ],
    },
    {
      category: 'Backend',
      skills: [
        { name: 'Node.js', level: 82 },
        { name: 'Express.js', level: 80 },
        { name: 'MongoDB', level: 75 },
        { name: 'PostgreSQL', level: 78 },
        { name: 'REST API', level: 85 },
      ],
    },
    {
      category: 'Tools & Others',
      skills: [
        { name: 'Git', level: 88 },
        { name: 'Docker', level: 70 },
        { name: 'AWS', level: 72 },
        { name: 'CI/CD', level: 75 },
        { name: 'Figma', level: 80 },
      ],
    },
  ];

  const technologies = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Express.js',
    'MongoDB', 'PostgreSQL', 'Tailwind CSS', 'Material UI', 'Next.js',
    'Git', 'Docker', 'AWS', 'Firebase', 'GraphQL'
  ];

  return (
    <section id="skills" className="py-20 bg-white">
      <Container maxWidth="lg">
        <Box className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Keahlian <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Saya</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Teknologi dan tools yang saya kuasai untuk membangun aplikasi web modern
          </p>
        </Box>

        <Grid container spacing={4} className="mb-12">
          {skillCategories.map((category, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card className="h-full border border-gray-100 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <Typography variant="h5" className="font-bold text-gray-900 mb-6 text-center">
                    {category.category}
                  </Typography>
                  <Box className="space-y-4">
                    {category.skills.map((skill, skillIndex) => (
                      <Box key={skillIndex}>
                        <Box className="flex justify-between items-center mb-1">
                          <Typography variant="body2" className="font-medium text-gray-700">
                            {skill.name}
                          </Typography>
                          <Typography variant="body2" className="text-gray-500">
                            {skill.level}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={skill.level}
                          className="h-2 rounded-full"
                          sx={{
                            backgroundColor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': {
                              background: 'linear-gradient(90deg, #2563eb, #9333ea)',
                              borderRadius: '4px',
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 md:p-12">
          <Typography variant="h5" className="font-bold text-gray-900 mb-6 text-center">
            Teknologi yang Saya Gunakan
          </Typography>
          <Box className="flex flex-wrap gap-3 justify-center">
            {technologies.map((tech, index) => (
              <Chip
                key={index}
                label={tech}
                className="bg-white text-gray-700 font-medium px-4 py-2 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-default shadow-sm"
              />
            ))}
          </Box>
        </Box>
      </Container>
    </section>
  );
};

export default Skills;

