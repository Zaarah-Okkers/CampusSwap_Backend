import pool from '../config/db.js';

export const getServiceTypes = async (req, res) => {
    try {
        const [serviceTypes] = await pool.query(`
            SELECT
                MIN(user_id) AS id,
                service_type AS name,
                NULL AS description
            FROM service_provider_profiles
            GROUP BY service_type
            ORDER BY service_type
        `);
        
        res.status(200).json({
            success: true,
            count: serviceTypes.length,
            data: serviceTypes
        });

    } catch (error) {
        console.error("Error fetching service types:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch service types."
        });
    }
};
