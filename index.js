// Require the necessary discord.js classes
const { Client, Intents, MessageAttachment, MessageEmbed , MessageActionRow, MessageButton} = require('discord.js');
const { token } = require('./config.json')
const fetch = require('node-fetch');
const sharp = require('sharp');

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

// This next array purpose is to help clean code
// before we had harcoded and too much repeated code
const imgArray = [[0,0,0],[1,0,256],[2,0,512],[3,256,0],[4,256,256],[5,256,512],[6,512,0],[7,512,256],[8,512,512]];

// this function request craiyon's backend for images
// backends:
// https://bf.dallemini.ai/generate
// https://backend.craiyon.com/generate
function promptImage(promptMsg){
  return fetch("https://bf.dallemini.ai/generate",
          { method: 'POST',
            headers: {  
                	Accept: "application/json",
               		"Content-Type": "application/json"},
            body: JSON.stringify({prompt: promptMsg.trim()})
          })
}

function cropImage(imgURL,customId){
	return fetch(imgURL)
			.then(res => res.blob())
			.then(imgBlob => {
				return imgBlob.arrayBuffer()
									.then(buff=>{
										imgBuffer = Buffer.from(buff);
										imgSize = 256;
										return sharp(imgBuffer)
													.extract({	top: parseInt(customId.split('-')[2]),
																left: parseInt(customId.split('-')[3]),
																width: imgSize,
																height: imgSize})
													.toBuffer()
									})
			})
}

// This listens to interactions type commands
client.on('interactionCreate', interaction => {
  if(!interaction.isCommand()) return;

  const { commandName } = interaction;

  if(commandName=='showme') {
    
    //obtain the prompt
    let msgreq = interaction.options.getString('prompt');
    
    //print the request to console
    console.log(`--- ${interaction.user.username} requested "${msgreq}"`)
    
    interaction.reply({content: `*\`...loading\`*`, fetchReply: true })
      .then(lastMsg=> {
		//console.log(lastMsg);
		// inital performance mark
		let initTime = performance.now();
		promptImage(msgreq)
			.then(res => {
				return res.json()
			})
			.then((arr)=>{
				let buffers = arr.images
									.map((img)=>{
										return new Buffer.from(img, "base64");
									})
				
				const compObjects = imgArray.map(element => {return {input:buffers[element[0]],top:element[1],left:element[2]}});
				
				sharp({
					create:{
						width: 768,
						height: 768,
						channels: 3,
						background: {r:150,g:150,b:150}
					}
				}).composite(compObjects)
				.toFormat('png')
				//.toFile("./result.png")
				.toBuffer((err, data, info)=>{
					//console.log(info);
					// since sharp process is async, we need to continue inside this callback
					// building components for the reply
					let promptGrid = new MessageAttachment(data,`promptGrid.png`);
					let resultEmbed = new MessageEmbed()
										.setAuthor({name:"DALL•E Mini",iconURL:"https://raw.githubusercontent.com/borisdayma/dalle-mini/main/img/logo.png"})
										.setTitle('Prompt')
										.setDescription(`*"${msgreq}"*`)
										.setColor('#252525')
										.setImage(`attachment://promptGrid.png`)
										.setFooter({	text: `requested by ${interaction.user.username}`, 
														iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.jpg`})
					let buttons = [...imgArray,"10"].map(n=>{
						return (n == "10")? new MessageButton()
													.setCustomId('btnVariation')
													.setLabel('↺')
													.setStyle('SECONDARY'):
											new MessageButton()
													.setCustomId(`btn-${n[0]}-${n[1]}-${n[2]}`)
													.setLabel(`${n[0]+1}`)
													.setStyle('SECONDARY')
					})
					const row1 = new MessageActionRow().addComponents(buttons.slice(0,5));
					const row2 = new MessageActionRow().addComponents(buttons.slice(5));		
															
					// Calculate Performace
					let finalTime = performance.now();
					var timeDiff = finalTime - initTime; 
					timeDiff /= 1000; 
					var seconds = Math.round(timeDiff);

					// Send the final embed
					interaction.editReply({ content: `*\`${seconds} sec elapsed\`*`, 
											embeds: [resultEmbed], 
											files: [promptGrid], 
											components: [row1, row2], 
											fetchReply: true })			
				});
			})
	})
  }
});

client.on('interactionCreate', interaction => {
	if(!interaction.isButton()) return;
	let croppedEmbed = interaction.message.embeds[0];
	const {customId} = interaction;
	if(customId != "btnVariation"){
		cropImage(interaction.message.embeds[0].image.url,customId).then(data => {
			let croppedImg = new MessageAttachment(data,"cropped.png");
			croppedEmbed.setImage("attachment://cropped.png");
			interaction.reply({	content: `*\`extracted image ${parseInt(customId.split('-')[1])+1}\`*`, 
								embeds:[croppedEmbed], 
								files: [croppedImg]});
		})
	}
})

// Login to Discord with your client's token
client.login(token);
