-- Read-only verification of the explicit Meta QA scenario.
BEGIN READ ONLY;
DO $$ DECLARE n integer; countries integer; BEGIN
 WITH expected(id,code,lat,lng) AS (VALUES
('c2330000-0000-4000-8000-000000000001'::uuid,'QA-A-LIMA',-12.05,-77.04),
('c2330000-0000-4000-8000-000000000002'::uuid,'QA-A-AREQUIPA',-16.4,-71.54),
('c2330000-0000-4000-8000-000000000003'::uuid,'QA-A-PIURA',-5.19,-80.63),
('ea5dc26a-8c74-5355-a299-8f9a07065843'::uuid,'JUDGES_US_NEW_YORK',40.71,-74.01),
('446fcb2c-1255-5a03-b30c-24ac2467bb99'::uuid,'JUDGES_US_LOS_ANGELES',34.05,-118.24),
('4ef0ac59-ab2f-5483-b765-2c6b4efa8095'::uuid,'JUDGES_CA_TORONTO',43.65,-79.38),
('cc54696f-974a-5739-86ef-ff8c61fc50d3'::uuid,'JUDGES_CA_MONTREAL',45.5,-73.57),
('0be9b14b-6e2d-5cb7-89ef-9a5f92db2ad7'::uuid,'JUDGES_MX_MEXICO_CITY',19.43,-99.13),
('fd40fe59-e6df-5d65-9e8d-5417bd49cb92'::uuid,'JUDGES_MX_MONTERREY',25.69,-100.32),
('5f452874-5651-5396-ab2d-56cae5f0e6ac'::uuid,'JUDGES_CO_BOGOTA',4.71,-74.07),
('89e745de-8202-5980-bfb3-fd4d18dfca90'::uuid,'JUDGES_CO_MEDELLIN',6.24,-75.58),
('bfca383f-bb8b-530c-b081-4db834e05b1f'::uuid,'JUDGES_EC_QUITO',-0.18,-78.47),
('6a4d115a-dd13-5aae-96f0-5a51d87c01cf'::uuid,'JUDGES_EC_GUAYAQUIL',-2.17,-79.92),
('aa036688-9dbe-5d90-8d5c-2d6decc68b38'::uuid,'JUDGES_CL_SANTIAGO',-33.45,-70.67),
('30231f87-cac5-5ecb-af19-d52e23584079'::uuid,'JUDGES_CL_VALPARAISO',-33.05,-71.61),
('6c331ade-ab90-5057-9e2a-8910145596e7'::uuid,'JUDGES_BR_SAO_PAULO',-23.55,-46.63),
('337603a2-6f39-5b53-a9c7-67218705dcc8'::uuid,'JUDGES_BR_RIO_DE_JANEIRO',-22.91,-43.17),
('cbfec600-77e9-5670-809f-0871d62dcfc3'::uuid,'JUDGES_AR_BUENOS_AIRES',-34.6,-58.38),
('d00321cc-36a6-59fe-b11f-ed097cb9cdbb'::uuid,'JUDGES_AR_CORDOBA',-31.42,-64.19),
('c9e0ca88-def7-5013-b517-32eeff0f2b1e'::uuid,'JUDGES_ES_MADRID',40.42,-3.7),
('37936481-2276-5065-99c6-58a8b73ed4d4'::uuid,'JUDGES_ES_BARCELONA',41.39,2.17),
('d5283963-f097-5a77-9e49-60a6decfb6fc'::uuid,'JUDGES_FR_PARIS',48.86,2.35),
('0c33449a-dc86-547b-8487-dbc49c19a62e'::uuid,'JUDGES_FR_LYON',45.76,4.84),
('10e659fe-a428-51b1-81a9-eea9a209e197'::uuid,'JUDGES_DE_BERLIN',52.52,13.41),
('26eac8d0-2a99-5df2-9ade-8407737df6a8'::uuid,'JUDGES_DE_HAMBURG',53.55,10.0),
('39ddc5d0-6401-59e9-8a9f-946ad4b65ac3'::uuid,'JUDGES_GB_LONDON',51.51,-0.13),
('5d50b8fb-d249-555e-8ca3-3ee411ff2981'::uuid,'JUDGES_GB_MANCHESTER',53.48,-2.24),
('c88547b3-cf1c-5399-b306-d8add2e4b63f'::uuid,'JUDGES_IN_MUMBAI',19.08,72.88),
('708a1b09-d863-531b-b3c2-24c212b01298'::uuid,'JUDGES_IN_DELHI',28.61,77.21),
('c6777ece-2438-5c4b-b0fb-b29c03b24d50'::uuid,'JUDGES_JP_TOKYO',35.68,139.69),
('19aad5e2-f3c1-542c-83e8-0690598c50df'::uuid,'JUDGES_JP_OSAKA',34.69,135.5),
('0e016a61-b296-5309-bc34-8fb5b78f3766'::uuid,'JUDGES_AU_SYDNEY',-33.87,151.21),
('46927f60-541a-59b1-9c79-0f55479b812c'::uuid,'JUDGES_AU_MELBOURNE',-37.81,144.96),
('21b315ba-e022-51ed-941b-5225b3d72232'::uuid,'JUDGES_ZA_JOHANNESBURG',-26.2,28.04),
('c3d5012d-e820-557c-aec7-018d2311ad05'::uuid,'JUDGES_ZA_CAPE_TOWN',-33.92,18.42))
 SELECT count(*),count(DISTINCT f.country_code) INTO n,countries FROM expected e
 JOIN public.facilities f ON f.id=e.id AND f.code=e.code
 WHERE f.organization_id='c2300000-0000-4000-8000-000000000001' AND f.active AND f.latitude=e.lat AND f.longitude=e.lng;
 IF n<>35 OR countries<>17 THEN RAISE EXCEPTION 'META_DEMO_VERIFICATION_FAILED'; END IF;
END $$;
SELECT json_build_object('scenario','v2-meta-international-demo','expectedFacilities',35,
 'activeFacilities',count(*),'withCoordinates',count(*) FILTER(WHERE latitude IS NOT NULL AND longitude IS NOT NULL),
 'countries',count(DISTINCT country_code),'coverageConfirmed',false,'capacityConfirmed',false)
 FROM public.facilities WHERE organization_id='c2300000-0000-4000-8000-000000000001' AND active;
COMMIT;
