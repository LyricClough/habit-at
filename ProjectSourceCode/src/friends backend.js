
app.get('/friends', async (req, res) => {
  
    try {
      const user = req.session.user;
  
    if (!user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    catch (error) {
      console.error('Error checking user session:', error);
      return res.redirect('/login');
    };
   
    
  
  
   
    var query = 'SELECT friends.sender, friends.receiver FROM friends WHERE (sender = $1 OR receiver = $1) AND mutual = true';
   
    var pendingREquest = 'SELECT friends.sender FROM friends WHERE reciever = $1 AND mutual = false';
    var friends = [];
    var pending = [];
    try {
      const friendslist = await( db.any(query, [userId]));
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
    try{
      const pendinglist = await( db.any(pendingREquest, [userId]));
    }
    catch (error) {
      console.error('Error fetching pending requests:', error);
    }
    friendslist.forEach(friend =>{
      friends[friend.sender][friend.receiver][friend.mutual] = friend;
    })
    pendinglist.forEach(pendingRequest =>{
      pending[pendingRequest.sender] = pendingRequest;
    }
    )
   
    
    res.render('pages/friends', {
      user: req.session.user,
      friends: friends,
      pending: pending
  
   
      })
   
      .catch(error => {
   
        console.error('Error fetching friends:', error);
   
        res.status(500).json({status: 'error', message: 'Error fetching friends'});
   
      });
   
  });
   
  
   
  app.post('/send-friend-request', (req, res) => {
   
    const { friendId } = req.body;
   
    const userId = req.session.user.id;
    
    const query = `
   
      INSERT INTO friends (sender, receiver, mutual)
   
      VALUES ($1, $2, false)
   
      RETURNING sender, receiver;
   
    `;
   
    db.one(query, [userId, friendId])
   
      .then(friend => {
   
        res.status(200).json({status: 'success', message: 'Friend Request sent', friend});
   
      })
   
      .catch(error => {
   
        console.error('Error adding friend:', error);
   
        res.status(500).json({status: 'error', message: 'Error adding friend'});
   
      });
   
  
  });
   
  
  
   
  
  app.post('/accept-friend', (req, res) => {
   
  
    const { friendId } = req.body;
   
  
    const userId = req.session.userInfo.userId;
   
  
    const query = `
   
  
      UPDATE friends
   
  
      SET mutual = true
   
  
      WHERE sender = $1 AND receiver = $2;
   
  
    `;
   
  
    db.none(query, [friendId, userId])
   
  
      .then(() => {
   
  
        res.status(200).json({status: 'success', message: 'Friend request accepted'});
   
  
      })
   
  
      .catch(error => {
   
  
        console.error('Error accepting friend request:', error);
   
  
        res.status(500).json({status: 'error', message: 'Error accepting friend request'});
   
  
      });
   
  });
  
  