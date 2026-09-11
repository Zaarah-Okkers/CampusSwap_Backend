import express from 'express';

import {
    createServiceRequest,
    getServiceRequests,
    assignProvider,
    updateServiceStatus
} from '../controllers/serviceController.js';

const router = express.Router();

router.post('/', createServiceRequest);

router.get('/', getServiceRequests);

router.patch('/:id/assign', assignProvider);

router.patch('/:id/status', updateServiceStatus);

export default router;