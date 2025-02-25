# FlashMat Client

Frontend application for FlashMat - A mathematics flashcard learning platform.

## Features

- Interactive flashcard interface with math equation support
- Real-time validation of mathematical answers
- Progress tracking and statistics
- Collaborative learning features
- Dark/Light theme support
- Responsive design for all devices

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── context/       # React context providers
├── hooks/         # Custom React hooks
├── pages/         # Page components
├── services/      # API services
├── styles/        # Global styles and themes
├── types/         # TypeScript type definitions
└── utils/         # Helper functions
```

## Technologies

- React 18
- TypeScript
- Material-UI
- React Router
- Formik & Yup
- MathJax
- Axios

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## Available Scripts

- `npm start`: Start development server
- `npm test`: Run tests
- `npm run build`: Build for production
- `npm run lint`: Lint code
- `npm run format`: Format code

## Environment Variables

Create a `.env.local` file with:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WEBSOCKET_URL=ws://localhost:5000
```

## License

MIT
