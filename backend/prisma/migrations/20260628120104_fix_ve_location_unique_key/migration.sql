-- DropIndex
DROP INDEX "ve_locations_name_parentId_type_key";

-- CreateIndex
CREATE UNIQUE INDEX "ve_locations_name_parentId_type_stateName_key" ON "ve_locations"("name", "parentId", "type", "stateName");

