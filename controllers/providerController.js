import pool from '../config/db.js';

export const getProviders = async (req, res) => {

    try {

        const { service } = req.query;

        let query = `
            SELECT
                u.id,
                u.full_name,
                u.email,
                NULL AS phone,
                p.bio,
                NULL AS experience_years,
                p.location AS service_area,
                p.rating,
                p.total_reviews AS rating_count,
                (p.verification_status = 'verified') AS is_verified,
                p.service_type AS services
            FROM users u
            JOIN service_provider_profiles p ON p.user_id = u.id
            WHERE u.role = 'service_provider'
              AND u.is_banned = FALSE
        `;

        const queryParams = [];

        // Filter by service if one was provided
        if (service) {

            query += `
                AND p.service_type = ?
            `;

            queryParams.push(service);
        }

        query += `
            ORDER BY p.rating DESC
        `;

        const [providers] = await pool.query(query, queryParams);

        res.status(200).json({
            success: true,
            count: providers.length,
            data: providers
        });

    } catch (error) {

        console.error('Error fetching providers:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch providers.'
        });
    }
};
