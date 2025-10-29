import express, { Application } from 'express';
import rootRouter from './routes';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', rootRouter);

app.use(errorHandler);

app.get('/', (req, res) => {
    res.send('API is running');
});


export default app;
