import express from 'express';

import {
    createServiceRequest,
    getServiceRequests,
    assignProvider,
    updateServiceStatus
} from '../controllers/serviceController.js';

const router = express.Router();

// SafeHome service requests
router.post('/', createServiceRequest);
router.get('/', getServiceRequests);

// Explicit emergency endpoint. The controller stores the request with emergency
// priority while using the same validated SafeHome request workflow.
router.post('/emergency', (req, res, next) => {
    req.body = { ...req.body, emergency: true, priority: 'emergency' };
    createServiceRequest(req, res, next);
});

// Residence Manager/provider workflow
router.patch('/:id/assign', assignProvider);
router.patch('/:id/status', updateServiceStatus);

export default router;