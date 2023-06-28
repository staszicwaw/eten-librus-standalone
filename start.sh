#!/bin/bash

. /home/pi/.nvm/nvm.sh
if [[ "$1" == "nts" ]]; then
	echo "Skipping typescript compilation"
else
	rm -dr dist/
	npx tsc
	if [ ! $? -eq 0 ]
	then
	        echo "Typescript didn't compile :("
	        exit
	fi
	echo "Typescript compiled"
fi

/home/pi/.nvm/versions/node/v20.2.0/bin/node dist
touch data/crashed
curl -X POST `cat webhook-link` -H "Content-Type: application/json" --data-binary @- <<DATA
{
"content": "<@895752707032367145> It's dead, jim."
}
DATA
