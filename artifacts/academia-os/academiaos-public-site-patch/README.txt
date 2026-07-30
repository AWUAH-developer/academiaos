AcademiaOS public Features and Packages patch

1. Upload academiaos-public-site-patch.zip to the AcademiaOS Replit project root.
2. In the Replit Shell run:

   cd ~/workspace/artifacts/academia-os
   unzip -o academiaos-public-site-patch.zip
   bash academiaos-public-site-patch/apply.sh

3. Wait for PUBLIC WEBSITE BUILD PASSED.
4. Preview:
   /features
   /pricing
5. Republish the existing deployment after checking both pages.

The patch makes a timestamped backup under .public-site-backup before replacing files.
It does not alter the database schema and does not invent public package prices.
