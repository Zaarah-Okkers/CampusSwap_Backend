
import express from 'express';

import {
    getServiceTypes
} from '../controllers/serviceTypeController.js';

const router = express.Router();

router.get('/', getServiceTypes);

export default router;

