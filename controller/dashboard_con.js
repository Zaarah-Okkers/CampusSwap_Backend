// callbacks for the dashboards

import { getStudentDashData, getAdminStats, getResMangerData, getProviderData} from "../model/dashboards.js";


// students dashbaords
export const fetchStudentDashb = async (req, res)=> { 

  try {

    const {userId} = req.params;

    const  data = await getStudentDashData (userId);
    
    res.status(200).json(data);
  }

  catch (error){

    res.status(500).json ({error: error.message});

  };
}


// admin dashboard
export const fetchAdminDash = async (req, res) => {

  try {

    const stats = await getAdminStats();

    res.status(200).json(stats);
  }

  catch (error) {

    res.status(500).json ({error: error.message });
  };

};


// the res manager dashbaords
export const fetchResMgnerDash = async (req, res) => {

  try {
    const data = await getResMangerData();
    res.status(200).json (data)

  }
  catch (error){ 
    res.status(500).json ({error: error.message });

  }
};


// the service provider dashboards 

export const fetchProviderDash = async (req, res) => {

  try {

    const {providerId} = req.params;

    const data = await getProviderData(providerId);
    res.status(200).json(data);

  }
  catch (error){

     res.status(500).json ({error: error.message });

  }
};