import pool from '../config/db.js';


export const createServiceRequest = async (req, res) => {
     console.log('BODY: req.body', req.body); // Log the request body for debugging 
    try {

        const student_id = req.body.student_id ?? req.body.studentId;
        const service_type_id = req.body.service_type_id ?? req.body.serviceTypeId;
        const title = req.body.title;
        const description = req.body.description;
        const residence_name = req.body.residence_name ?? req.body.residenceName;
        const room_number = req.body.room_number ?? req.body.roomNumber;
        const photo_url = req.body.photo_url ?? req.body.photoUrl;
        const priority = req.body.priority || (req.body.emergency ? 'emergency' : 'normal');

        // Check required fields
        if (
            !student_id ||
            !service_type_id ||
            !title ||
            !description ||
            !residence_name
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields.'
            });
        }

        // Check that the service type exists
        const [serviceType] = await pool.query(
            `
            SELECT id
            FROM service_types
            WHERE id = ?
            `,
            [service_type_id]
        );

        if (serviceType.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service type not found.'
            });
        }

        // Create the service request
        const [result] = await pool.query(
            `
            INSERT INTO services (
                student_id,
                service_type_id,
                title,
                description,
                residence_name,
                room_number,
                photo_url,
                priority
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                student_id,
                service_type_id,
                title,
                description,
                residence_name,
                room_number || null,
                photo_url || null,
                priority
            ]
        );

        // Get the newly created request
        const [newService] = await pool.query(
            `
            SELECT
                s.id,
                s.student_id,
                s.service_type_id,
                st.name AS service_type,
                s.title,
                s.description,
                s.residence_name,
                s.room_number,
                s.photo_url,
                s.status,
                s.priority,
                s.estimated_cost,
                s.created_at
            FROM services s
            INNER JOIN service_types st
                ON s.service_type_id = st.id
            WHERE s.id = ?
            `,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Service request created successfully.',
            data: newService[0]
        });

    } catch (error) {

        console.error('Error creating service request:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to create service request.'
        });
    }
};

// GET service requests with optional filters for student_id, provider_id, and status

export const getServiceRequests = async (req, res) => {

    try {

        const { student_id, provider_id, status } = req.query;

        let query = `
            SELECT
                s.id,
                s.student_id,
                s.service_provider_id,
                s.service_type_id,
                st.name AS service_type,

                s.title,
                s.description,
                s.residence_name,
                s.room_number,
                s.photo_url,

                s.status,
                s.priority,
                s.estimated_cost,
                s.created_at,

                student.full_name AS student_name,
                provider.full_name AS provider_name

            FROM services s

            INNER JOIN service_types st
                ON s.service_type_id = st.id

            INNER JOIN users student
                ON s.student_id = student.id

            LEFT JOIN users provider
                ON s.service_provider_id = provider.id

            WHERE 1 = 1
        `;

        const queryParams = [];

        // Filter by student
        if (student_id) {

            query += `
                AND s.student_id = ?
            `;

            queryParams.push(student_id);
        }

        // Filter by provider
        if (provider_id) {

            query += `
                AND s.service_provider_id = ?
            `;

            queryParams.push(provider_id);
        }

        // Filter by status
        if (status) {

            query += `
                AND s.status = ?
            `;

            queryParams.push(status);
        }

        query += `
            ORDER BY s.created_at DESC
        `;

        const [services] = await pool.query(query, queryParams);

        res.status(200).json({
            success: true,
            count: services.length,
            data: services
        });

    } catch (error) {

        console.error('Error fetching service requests:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch service requests.'
        });
    }
};



export const assignProvider = async (req, res) => {

    try {

        const { id } = req.params;
        const { service_provider_id } = req.body;

        // Check that a provider was supplied
        if (!service_provider_id) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a service provider ID.'
            });
        }

        // Check that the service request exists
        const [service] = await pool.query(
            `
            SELECT id, status
            FROM services
            WHERE id = ?
            `,
            [id]
        );

        if (service.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service request not found.'
            });
        }

        // Check that the provider exists and is actually a provider
        const [provider] = await pool.query(
            `
            SELECT id, full_name
            FROM users
            WHERE id = ?
              AND role = 'service_provider'
              AND is_banned = FALSE
            `,
            [service_provider_id]
        );

        if (provider.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service provider not found.'
            });
        }

        // Assign provider
        await pool.query(
            `
            UPDATE services
            SET
                service_provider_id = ?,
                status = 'assigned'
            WHERE id = ?
            `,
            [service_provider_id, id]
        );

        // Get updated request
        const [updatedService] = await pool.query(
            `
            SELECT
                s.id,
                s.student_id,
                s.service_provider_id,
                st.name AS service_type,
                s.title,
                s.description,
                s.residence_name,
                s.room_number,
                s.photo_url,
                s.status,
                s.priority,
                s.estimated_cost,
                s.created_at,
                u.full_name AS provider_name

            FROM services s

            INNER JOIN service_types st
                ON s.service_type_id = st.id

            LEFT JOIN users u
                ON s.service_provider_id = u.id

            WHERE s.id = ?
            `,
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Service provider assigned successfully.',
            data: updatedService[0]
        });

    } catch (error) {

        console.error('Error assigning provider:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to assign service provider.'
        });
    }
};

export const updateServiceStatus = async (req, res) => {

    try {

        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = [
            'pending',
            'assigned',
            'in_progress',
            'completed',
            'cancelled'
        ];

        // Check status
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a status.'
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid service status.'
            });
        }

        // Check if request exists
        const [service] = await pool.query(
            `
            SELECT id
            FROM services
            WHERE id = ?
            `,
            [id]
        );

        if (service.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service request not found.'
            });
        }

        // Update status
        await pool.query(
            `
            UPDATE services
            SET status = ?
            WHERE id = ?
            `,
            [status, id]
        );

        // Get updated request
        const [updatedService] = await pool.query(
            `
            SELECT
                s.id,
                s.student_id,
                s.service_provider_id,
                st.name AS service_type,
                s.title,
                s.description,
                s.residence_name,
                s.room_number,
                s.photo_url,
                s.status,
                s.priority,
                s.estimated_cost,
                s.created_at,
                u.full_name AS provider_name

            FROM services s

            INNER JOIN service_types st
                ON s.service_type_id = st.id

            LEFT JOIN users u
                ON s.service_provider_id = u.id

            WHERE s.id = ?
            `,
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Service status updated successfully.',
            data: updatedService[0]
        });

    } catch (error) {

        console.error('Error updating service status:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update service status.'
        });
    }
};