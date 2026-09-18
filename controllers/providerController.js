import pool from '../config/db.js';

export const getProviders = async (req, res) => {

    try {

        const { service } = req.query;

        let query = `
            SELECT
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.bio,
                u.experience_years,
                u.service_area,
                u.rating,
                u.rating_count,
                u.is_verified,

                GROUP_CONCAT(st.name SEPARATOR ', ') AS services

            FROM users u

            LEFT JOIN provider_services ps
                ON u.id = ps.provider_id

            LEFT JOIN service_types st
                ON ps.service_type_id = st.id

            WHERE u.role = 'service_provider'
              AND u.is_banned = FALSE
        `;

        const queryParams = [];

        // Filter by service if one was provided
        if (service) {

            query += `
                AND EXISTS (
                    SELECT 1
                    FROM provider_services ps2
                    INNER JOIN service_types st2
                        ON ps2.service_type_id = st2.id
                    WHERE ps2.provider_id = u.id
                      AND st2.name = ?
                )
            `;

            queryParams.push(service);
        }

        query += `
            GROUP BY
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.bio,
                u.experience_years,
                u.service_area,
                u.rating,
                u.rating_count,
                u.is_verified

            ORDER BY u.rating DESC
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