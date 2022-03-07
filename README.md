# nano-data-tools
Nano XNO crypto currency data tools for Node.js. Transfer data over the Nano blockchain.

### Types

<pre>
TYPE 00 - Singlepart data - raw.
$2	.2/	.002/	.00002/	.0000002/
	.02	.0002	.000002 .00000002
Meta Packet									#Type	Last6OfReceivingAddress--------------------
0	,00	,00	,00	,00	,00	,00	,0	,0	,00	,00	,00	,00	,00	,00	,00	,00


TYPE 10 - Multipart data - raw - fixed length.
$2	.2/	.002/	.00002/	.0000002/
	.02	.0002	.000002 .00000002
Meta Packet				#Bytes	#Pckts	#CRC16Hash---------	#Type	Last6OfReceivingAddress--------------------
0	,00	,00	,00	,00	,10	,0	,0	,00	,00	,10	,00	,00	,00	,00	,00	,00
Data Packet			#Data-(Based on #Bytes)----------------------------------------------------	#CRC16Hash---------
0	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,0	,00	,00
Data Packet			#Data-(Based on #Bytes)----------------------------------------------------	#CRC16Hash---------
0	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,0	,00	,00
Data Packet			#Data-(Based on #Bytes)----------------------------------------------------	#CRC16Hash---------
0	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,0	,00	,00
Data Packet			#Data-(Based on #Bytes)----------------------------------------------------	#CRC16Hash---------
0	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,00	,0	,00	,00
</pre>
