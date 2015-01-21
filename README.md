# ApiWrapper

A lightweight wrapper for any api.


#Usage

Create a JSON object to describe your api.

    var BlogAPI = new ApiWrapper({
  
      apiPath: "http://api.blogapp.com",
  
      ajaxOptions: {
        headers: {
          access_token: "123456789"
        },
      },
  
      methods: {
        createPost    : "POST  posts/   *name",
        createUser    : "POST  users/   *name",
        createComment : "POST  posts/:post_id/comments   *post_id,body",
      },
  
      resourceMethods: {
        getUser: "User,
        getPost: "Post",
        getComment: "Comment"
      },
  
      resources: {
  
        User:{
          require: ["id"],
          defaults: {
            id: "me"
          },
          methods: {
            fetch         : "GET      users/:id",
            update        : "PUT      users/:id",
            destroy       : "DELETE   users/:id",
            posts         : "GET      users/:id/posts/",
            createPost    : "POST     users/:id/posts/"
          }
        },
  
        Post: {
          require: ["id"],
          methods: {
            fetch         : "GET      posts/:id",
            update        : "PUT      posts/:id",
            destroy       : "DELETE   posts/:id",
            comments      : "GET      posts/:id/posts/",
            createComment : "POST     posts/:id/comments/       *body",
            tagPost       : "POST     posts/:id/tag/:tag_name   *tag_name"
          }        
        },
  
        Comment: {
          require: ["id"],
          methods: {
            fetch         : "GET      comments/:id",
            update        : "PUT      comments/:id",
            destroy       : "DELETE   comments/:id"
          }
        }
  
      }
    });


Then you can access it like this:
  
  
    var myUser = BlogAPI.getUser();
    
    // makes an ajax call to http://api.blogapp.com/users/me
    myUser.fetch()
  
    var anotherUser = BlogAPI.getUser(123);
    
    // makes an ajax call to http://api.blogapp.com/users/123
    anotherUser.fetch()
  
    // makes an ajax call to http://api.blogapp.com/users/123/posts?sort_by=date
    anotherUser.posts({sort_by:"date"})
  
  
    var myPost = BlogAPI.getPost(123);
  
    // makes an ajax call to http://api.blogapp.com/posts/123
    mypost.fetch()
  
    // makes an ajax call to http://api.blogapp.com/posts/123/comments
    mypost.comments()
  
    // makes an ajax call to http://api.blogapp.com/posts/123/comments?page=2
    mypost.comments({page:2})
    
    // makes an ajax call to http://api.blogapp.com/posts/123/tag/favorite
    mypost.tagPost("favorite")

  
All calls return a promise

    BlogAPI.createComment(123, "This is a new Comment on post 123").then(function(response){
        console.log(response)
    }, function(err){
        console.log(err)
    })




