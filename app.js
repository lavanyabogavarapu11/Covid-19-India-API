const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dbPath = path.join(__dirname, "covid19India.db");
const app = express();
app.use(express.json());
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//GET list of all states API1
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT * FROM state`;
  const stateArray = await db.all(getStatesQuery);
  response.send(
    stateArray.map((eachObject) =>
      convertStateDbObjectToResponseObject(eachObject)
    )
  );
});

//GET single state API2
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT * FROM state
    WHERE state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertStateDbObjectToResponseObject(state));
});

//POST create district API3
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const addDistrictQuery = `
    INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
    VALUES
    (
    '${districtName}',
    ${stateId},
    ${cases},
    ${cured},
    ${active},
    ${deaths});`;

  const dbResponse = await db.run(addDistrictQuery);
  const directorId = dbResponse.lastID;
  response.send("District Successfully Added");
});

//Get single district API 4
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT * FROM district
    WHERE district_id = ${districtId}`;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

//Delete district API 5
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district
    WHERE district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Update district API 6
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
    UPDATE district
    SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//GET Sum of API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateSumOfQuery = `
    SELECT SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM district 
    WHERE state_id = ${stateId};`;
  const sumArray = await db.get(getStateSumOfQuery);
  console.log(sumArray);
  response.send({
    totalCases: sumArray["SUM(cases)"],
    totalCured: sumArray["SUM(cured)"],
    totalActive: sumArray["SUM(active)"],
    totalDeaths: sumArray["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
   SELECT state_name as stateName
   FROM state
   NATURAL JOIN district
   WHERE
   district_id = ${districtId};`;
  const stateName = await db.get(getStateNameQuery);
  response.send(stateName);
});

module.exports = app;
