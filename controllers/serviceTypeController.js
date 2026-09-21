import pool from '../config/db.js';

export const getServiceTypes = async (req, res) => {
    try {
        const [serviceTypes] = await pool.query(`
            SELECT id, name, description
            FROM service_types
            WHERE is_active = TRUE
            ORDER BY name
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
