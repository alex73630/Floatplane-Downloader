Installing
-------
#### Windows
If you have not installed required programs, do it in first :

> Placeholder: Links to download softwares for windows

Open a CMD/PowerShell window where you want to install the program

> You can do a **Shift+Right Click** in a Explorer window to open a CMD/PowerShell window that pointing to your folder

##### With Git
If you have installed *Git*, lets run this command to clone (download) the Git repo:

    git clone *repo address*

Then, in your CMD/PowerShell window, go to the program folder with this command

    cd floatplane-downloader

And install program dependencies with this command:

    npm install

Go to "Run the app" step to continue.

##### Without Git
If you have not, simply download the Git repo as a zip with this link: [Download Link](https://codeload.github.com/alex73630/floatplane-downloader/zip/master)
And extract it where you want to install the program.

Then, in your CMD/PowerShell window, go to the program folder with this command

    cd floatplane-downloader-master

And install program dependencies with this command:

    npm install

Let's configure the script now !

##### Configure the script
In the program folder, you can find a file named *config.json.sample*, let's copy this file to *config.json* and modify it.
To do this, you can use the Windows Notepad or any editor you use.

Here is what this file should contains:

    {
		"auth": "username",
		"password": "password",
		"videoQuality": "1080",
		"plexFolder": "/home/plex/medias/floaplaneclub/",
		"lttFolderName": "Linus Tech Tips/",
		"tqFolderName": "Techquickie/",
		"csfFolderName": "Channel Super Fun/"
	}

Here is some hints to understand what to put in this file:

 **auth** : It's your username/email you use to login in to your account.

 **password** : Enter your password you use on the forum.

 **videoQuality** : Pretty self-explained here, you just choose what quality you want to download your video. Values that you can use are **"360"**, **"480"**, **"720"**, **"1080"** and **"4k"** (4k could not work as it's not displayed on most posts, be aware that there is no fallback to a lower quality in case of unavailability at this time)

 **plexFolder** : Write the **full path** to your Plex Library folder, remember to create a dedicated folder for *Floatplane Club* as shown in the example.

 **ltt/tq/csf FolderName** : Those three values are for each channels, you have to create those three sub folders in the *Floatplane Club* folder you created just before.

**Make sure** that folders are **created** and named **exactly** as the config file.

When you finished, simply save the file and continue!

##### Run the app
After having installed and configured the script, you can run it with this command:

    npm start

The script will now start fetching new videos and downloading them.

Next step, [configure Plex](Configure-Plex.md)!


#### Linux
This part for Linux is written for Debian 8 in a shell-only environment and should work on every Debian-based systems like Ubuntu.

If you have not installed required programs, do it in first :

> Placeholder: Links to download softwares for Linux

In your shell, to the folder where you want to install the program.


##### With Git
If you have installed *Git*, lets run this command to clone (download) the Git repo:

    git clone *repo address*

Then, in your shell, go to the program folder with this command

    cd floatplane-downloader

And install program dependencies with this command:

    npm install

Go to "Run the app" step to continue.

##### Without Git
If you have not, simply download the Git repo as a zip and extract it where you want to install the program with this command:

    wget https://codeload.github.com/alex73630/floatplane-downloader/zip/master
    unzip floatplane-downloader-master.zip

Then, in your shell, go to the program folder with this command

    cd floatplane-downloader-master

And install program dependencies with this command:

    npm install

Let's configure the script now !

##### Configure the script
In the program folder, you can find a file named *config.json.sample*, let's copy this file to *config.json* and modify it.
For this example, we'll use Nano to edit the file but you can use any text editor you want.

    cp config.json.sample config.json
    nano config.json

Here is what this file should contains:

    {
		"auth": "username",
		"password": "password",
		"videoQuality": "1080",
		"plexFolder": "/home/plex/medias/floaplaneclub/",
		"lttFolderName": "Linus Tech Tips/",
		"tqFolderName": "Techquickie/",
		"csfFolderName": "Channel Super Fun/"
	}

Here is some hints to understand what to put in this file:

 **auth** : It's your username/email you use to login in to your account.

 **password** : Enter your password you use on the forum.

 **videoQuality** : Pretty self-explained here, you just choose what quality you want to download your video. Values that you can use are **"360"**, **"480"**, **"720"**, **"1080"** and **"4k"** (4k could not work as it's not displayed on most posts, be aware that there is no fallback to a lower quality in case of unavailability at this time)

 **plexFolder** : Write the **full path** to your Plex Library folder, remember to create a dedicated folder for *Floatplane Club* as shown in the example.

 **ltt/tq/csf FolderName** : Those three values are for each channels, you have to create those three sub folders in the *Floatplane Club* folder you created just before.

**Make sure** that folders are **created** and named **exactly** as the config file.

When you finished, simply save the file and continue!

##### Run the app
After having installed and configured the script, you can run it with this command:

    npm start

The script will now start fetching new videos and downloading them.

Next step, [configure Plex](Configure-Plex.md)!
