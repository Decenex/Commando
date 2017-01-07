const Canvas = require('canvas');
const { Command } = require('discord.js-commando');
const Experience = require('../../currency/Experience');
const fs = global.Promise.promisifyAll(require('fs'));
const path = require('path');
const request = require('request-promise');

const Currency = require('../../currency/Currency');

module.exports = class ProfileCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'profile',
			aliases: ['p'],
			group: 'social',
			memberName: 'profile',
			description: 'Display your profile.',
			guildOnly: true,
			throttling: {
				usages: 1,
				duration: 60
			},

			args: [
				{
					key: 'member',
					prompt: 'What user profile would you like to see?\n',
					type: 'member',
					default: ''
				}
			]
		});
	}

	async run(msg, args) {
		const user = args.member || msg.member;
		const Image = Canvas.Image;

		const balance = await Currency.getBalance(user.id);
		const currentExp = await Experience.getCurrentExperience(user.id);
		const level = await Experience.getLevel(user.id);
		const levelBounds = await Experience.getLevelBounds(level);
		const totalExp = await Experience.getTotalExperience(user.id);

		const fillValue = Math.min(Math.max(currentExp / (levelBounds.upperBound - levelBounds.lowerBound), 0), 1);

		Canvas.registerFont(path.join(__dirname, '../../assets/profile/fonts/Roboto.ttf'), { family: 'Roboto' });
		Canvas.registerFont(path.join(__dirname, '../../assets/profile/fonts/NotoEmoji-Regular.ttf'), { family: 'Roboto' });

		const canvas = new Canvas(300, 300);
		const ctx = canvas.getContext('2d');

		const lines = this.wrapText(ctx, '', 108 - parseInt(12, 0));

		const base = new Image();
		const cond = new Image();

		const generate = () => {
			// Environment Variables
			ctx.drawImage(base, 0, 0);
			ctx.scale(1, 1);
			ctx.patternQuality = 'billinear';
			ctx.filter = 'bilinear';
			ctx.antialias = 'subpixel';
			ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
			ctx.shadowOffsetY = 2;
			ctx.shadowBlur = 2;

			// Username
			ctx.font = '20px Roboto';
			ctx.fillStyle = '#FFFFFF';
			ctx.fillText(user.displayName, 50, 173);

			// EXP
			ctx.font = '10px Roboto';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#3498DB';
			ctx.shadowColor = 'rgba(0, 0, 0, 0)';
			ctx.fillRect(10, 191, fillValue * 135, 17);

			// EXP
			ctx.font = '10px Roboto';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#333333';
			ctx.shadowColor = 'rgba(0, 0, 0, 0)';
			ctx.fillText(`EXP: ${currentExp}/${levelBounds.upperBound - levelBounds.lowerBound}`, 78, 203);

			// LVL
			ctx.font = '30px Roboto';
			ctx.textAlign = 'left';
			ctx.fillStyle = '#E5E5E5';
			ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
			ctx.fillText('LVL.', 12, 235);

			// LVL Number
			ctx.font = '30px Roboto';
			ctx.fillStyle = '#E5E5E5';
			ctx.fillText(level, 86, 235);

			// Total EXP
			ctx.font = '14px Roboto';
			ctx.fillStyle = '#E5E5E5';
			ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
			ctx.fillText('Total EXP', 12, 254);

			// Total EXP Number
			ctx.font = '14px Roboto';
			ctx.fillStyle = '#E5E5E5';
			ctx.fillText(totalExp, 86, 254);

			/*// Global Rank
			ctx.font = '14px Roboto';
			ctx.fillStyle = '#E5E5E5';
			ctx.fillText('Rank', 12, 270);

			// Global Rank Number
			ctx.font = '14px Roboto';
			ctx.fillStyle = '#E5E5E5';
			ctx.fillText('#1', 86, 270);*/

			// Currency
			ctx.font = '14px Roboto';
			ctx.fillStyle = '#E5E5E5';
			ctx.fillText('Currency', 12, 287);

			// Currency Number
			ctx.font = '14px Roboto';
			ctx.fillStyle = '#E5E5E5';
			ctx.fillText(balance, 86, 287);

			// Info title
			ctx.font = '12px Roboto';
			ctx.fillStyle = '#333333';
			ctx.shadowColor = 'rgba(0, 0, 0, 0)';
			ctx.fillText('Info Box', 182, 207);

			// Info
			ctx.font = '12px Roboto';
			ctx.fillStyle = '#333333';
			lines.forEach((line, i) => {
				ctx.fillText(line, 162, (i + 18.6) * parseInt(12, 0));
			});

			// Image
			ctx.beginPath();
			ctx.arc(79, 76, 55, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.clip();
			ctx.shadowBlur = 5;
			ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
			ctx.drawImage(cond, 24, 21, 110, 110);
		};

		base.src = await fs.readFileAsync(path.join(__dirname, `../../assets/profile/backgrounds/test.png`));
		cond.src = await request({ uri: user.user.avatarURL.replace(/(png|jpg|jpeg|gif|webp)\?size=1024/, 'png'), encoding: null });
		await generate();

		return msg.channel.sendFile(await canvas.toBuffer(), `profile.png`);
	}

	getBase(icon) {
		if (icon === 'clear-day' || icon === 'partly-cloudy-day') {
			return path.join(__dirname, '../../assets/weather/base/sun.png');
		} else if (icon === 'clear-night' || icon === 'partly-cloudy-night') {
			return path.join(__dirname, '../../assets/weather/base/moon.png');
		} else if (icon === 'rain') {
			return path.join(__dirname, '../../assets/weather/base/rain.png');
		} else if (icon === 'snow' || icon === 'sleet' || icon === 'fog' || icon === 'wind') {
			return path.join(__dirname, '../../assets/weather/base/snow.png');
		} else {
			return path.join(__dirname, '../../assets/weather/base/cloud.png');
		}
	}

	wrapText(ctx, text, maxWidth) {
		const words = text.split(' ');
		let lines = [];
		let line = '';
		if (ctx.measureText(text).width < maxWidth) {
			return [text];
		}
		while (words.length > 0) {
			let split = false;
			while (ctx.measureText(words[0]).width >= maxWidth) {
				const tmp = words[0];
				words[0] = tmp.slice(0, -1);
				if (!split) {
					split = true;
					words.splice(1, 0, tmp.slice(-1));
				} else {
					words[1] = tmp.slice(-1) + words[1];
				}
			}
			if (ctx.measureText(line + words[0]).width < maxWidth) {
				line += `${words.shift()} `;
			} else {
				lines.push(line);
				line = '';
			}
			if (words.length === 0) {
				lines.push(line);
			}
		}
		return lines;
	}
};