############################################
cd ~/.ssh
ssh-keygen
name your key
cat <key.pub>
copy and paste in bitbucket settings SSH Keys
Then insert the config code inside the ~/.ssh/config

ssh -T git@bitbucket.org 
git clone git@bitbucket

############################################
To push code cloned from github to bitbucket

mkdir folder
cd folder
git clone <github repo url>
cd project
cat .git/config
git checkout <selected-branch>
git fetch --tags
git remote rm origin
cat .git/config
git remote add origin <git@bitbucket-repo>
cat .git/config
git push origin --all
