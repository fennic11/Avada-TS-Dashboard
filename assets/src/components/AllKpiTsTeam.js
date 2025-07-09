import React, { useState, useEffect } from 'react';
import { getKpiTsTeam } from '../api/workShiftApi';

const AllKpiTsTeam = () => {
    const [kpiTsTeam, setKpiTsTeam] = useState([]);
    useEffect(() => {
        const fetchKpiTsTeam = async () => {
            const kpiTsTeam = await getKpiTsTeam('2025-06-30', '2025-07-31');
            console.log(kpiTsTeam);
            setKpiTsTeam(kpiTsTeam);
        };
        fetchKpiTsTeam();
        }, []);
    return <div>
        textShadow
    </div>;
};

export default AllKpiTsTeam;