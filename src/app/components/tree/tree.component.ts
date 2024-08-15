import { Component, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlattener, MatTreeFlatDataSource, MatTreeModule } from '@angular/material/tree';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CdkTreeModule } from '@angular/cdk/tree';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';

export class TodoItemNode {
  children: TodoItemNode[] = [];
  item: string = '';
  id?: number; // Ensure ID is included
  expandable: boolean = true; // Add the 'expandable' property
  parent?: number;
  childrenLength?: number;
}

export class TodoItemFlatNode {
  item: string = '';
  level: number = 0;
  expandable: boolean = true;
  id?: number; // Ensure ID is included
  
}
const apiUrl = 'http://localhost:1337/api/tree';
@Injectable()
export class ChecklistDatabase {

  dataChange = new BehaviorSubject<TodoItemNode[]>([]);
  constructor(private http: HttpClient) {
    this.initialize();
  }

  get data(): TodoItemNode[] {
    return this.dataChange.value;
  }

  initialize() {
    this.http.get<any>(`${apiUrl}/getfilter/?parentId=`).subscribe(
      (response: any) => {
        try {
          // const data = this.mapNodes(response);
          // const data = response.nodes;
          const data = this.mapNodes(response.nodes);
          this.dataChange.next(data);
          // console.log('Data source:', this.dataChange.value);
        } catch (error) {
          console.error('Error processing data:', error);
          this.dataChange.next([]);
        }
      },
      error => {
        console.error('Error fetching data:', error);
        this.dataChange.next([]);
      }
    );
  }

  mapNodes(nodes: any[]): TodoItemNode[] {
    const convertToTodoItemNode = (node: any): TodoItemNode => {
      const todoItemNode = new TodoItemNode();
      todoItemNode.item = node.node;
      todoItemNode.parent = node.parent;
      todoItemNode.id = node.id; // Ensure ID is correctly mapped
      todoItemNode.children = (node.children || []).map(convertToTodoItemNode);
      todoItemNode.childrenLength = node.childrenLength;
      todoItemNode.expandable = node.childrenLength > 0;  // Set 'expandable' based on children length
      return todoItemNode;
    };

    return nodes.map(convertToTodoItemNode);
  }
}

@Component({
  selector: 'app-tree',
  templateUrl: 'tree.component.html',
  styleUrls: ['tree.component.scss'],
  providers: [ChecklistDatabase],
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatTreeModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    CdkTreeModule,
    ReactiveFormsModule,
    CommonModule,
    HttpClientModule,
    MatSelectModule
  ],
})
export class TreeComponent {
  flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>();
  nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>();
  selectedParent: TodoItemFlatNode | null = null;
  nodeInput: { [key: string | number]: string } = {}; // Store input values for each node
  treeControl: FlatTreeControl<TodoItemFlatNode>;
  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;
  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;
  checklistSelection = new SelectionModel<TodoItemFlatNode>(true /* multiple */);
  editingNode: TodoItemFlatNode | null = null;
  selectedNode: TodoItemFlatNode | null = null;
  isInputFieldVisible: boolean = false;
  updatedParent!: TodoItemFlatNode;
  filterKey: string = '';
  key: string = '';

  mapNodes(nodes: any[]): TodoItemNode[] { //works diff for bth..
    const nodeMap = new Map<number, TodoItemNode>();
    // First pass: Create all nodes and map them by ID
    nodes.forEach(node => {
      const todoItemNode = new TodoItemNode();
      todoItemNode.item = node.node;
      todoItemNode.id = node.id;
      todoItemNode.parent = node.parent?.id; // Store the parent ID
      todoItemNode.children = [];
      if (todoItemNode?.id) {
        nodeMap.set(todoItemNode.id, todoItemNode);
      }
    });

    // Second pass: Assign children to their parents
    nodeMap.forEach(node => {
      if (node.parent) {
        const parentNode = nodeMap.get(node.parent);
        if (parentNode) {
          parentNode.children.push(node);
        }
      }
    });

    // Return only root nodes (nodes without parents)
    return Array.from(nodeMap.values()).filter(node => !node.parent);
  }
  toggleInputField() {
    this.isInputFieldVisible = !this.isInputFieldVisible;
    this.nodeInput = {}; // Clear the input field when toggling
  }

  constructor(private _database: ChecklistDatabase, private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren,
    );

    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
    _database.dataChange.subscribe(data => {
      this.dataSource.data = data;
      this.initializeNodeInputs(data); // Initialize input values when data changes
    });
  }

  initialize() {
    this.dataSource.data = [...this.dataSource.data];
    this._database.dataChange.next(this.dataSource.data);
    this.dataSource.data.forEach(node => {
      this.nodeInput[node.item] = ''; // Initialize input for each node
    });

  }
  getDatabypage(node: TodoItemFlatNode) {
    const nodeId = node.id;
    if (!nodeId) return;
  
    this.http.get<any>(`${apiUrl}/getfilter/?parentId=${nodeId}`).subscribe(
      (response: any) => {
        try {
          const nodes = response.nodes || [];
          const childNodes = this._database.mapNodes(nodes); // Map the response to TodoItemNode[]
  
          const parentNode = this.flatNodeMap.get(node);
          if (parentNode) {
            parentNode.children = childNodes; // Append children to the node
            parentNode.expandable = childNodes.length > 0; // Update expandable status
            
            this._database.dataChange.next(this._database.data); // Trigger change detection
            this.treeControl.expand(node); // Expand the node to show the children
          }
        } catch (error) {
          console.error('Error processing data:', error);
        }
      },
      error => {
        console.error('Error fetching data:', error);
      }
    );
  }
  
  getDatabyFilter(filterKey: string) {
    if (!filterKey)
      return; // Exit if no filter key is provided

    this.http.get<any>(`${apiUrl}/getfilter/?filter=${filterKey}`).subscribe(
      (response: any) => {
        try {
          const nodes = response.nodes || [];
          const data = this.mapNodes(nodes); // Map the response to TodoItemNode[]
          this.dataSource.data = data;
          this.initializeNodeInputs(data); // Initialize input values for each node
          this.filterKey = ''; // Clear the filter key after applying the filter
        } catch (error) {
          console.error('Error processing data:', error);
          this.dataSource.data = [];
        }
      },
      error => {
        console.error('Error fetching data:', error);
        this.dataSource.data = [];
      }
    );
  }

  getLevel = (node: TodoItemFlatNode) => node.level;

  isExpandable = (node: TodoItemFlatNode) => node.expandable;

  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children;

  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.item === '';

  transformer = (node: TodoItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item ? existingNode : new TodoItemFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    if (node.childrenLength === 0) {
      flatNode.expandable = false
    }
    else {
      flatNode.expandable = true;
    }

    flatNode.id = node.id; // Map ID to flat node
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  createNode(node: TodoItemFlatNode) {
    const flatNode = this.flatNodeMap.get(node);
    const parent = flatNode;
    const parentId = parent?.id;
    const newValue = this.nodeInput[node.item] || ''; // Use the input value

    const payload = {
      node: newValue,
      parent: parentId
    };

    this.http.post(`${apiUrl}/create`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe(
      (response: any) => {
        // console.log('Node saved successfully:', response);
        const newNode: TodoItemNode = {
          item: newValue,
          id: response.id, // Assuming the response returns the new node ID
          children: [],
          expandable: false
        };

        this._database.initialize();
        this.nodeInput[node.item] = ''; // Clear the input field after saving
      },
      error => {
        console.error('Error saving node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }

  getParentNode(node: TodoItemFlatNode): TodoItemFlatNode | null {
    const currentLevel = this.getLevel(node);
    if (currentLevel < 1) {
      return null;
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];
      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

  // Initialize node input values
  initializeNodeInputs(nodes: TodoItemNode[]) {
    const traverseNodes = (node: TodoItemNode) => {
      this.nodeInput[node.item] = ''; // Initialize input for each node
      node.children.forEach(traverseNodes);
    };

    nodes.forEach(traverseNodes);
  }


  deleteNode(nodeId: TodoItemFlatNode) {
    this.http.delete(`${apiUrl}/delete/${nodeId}`).subscribe(
      (response: any) => {
        // console.log('Node deleted successfully:', response);
        // this.removeNodeFromTree(nodeId); //client side datasource
        this._database.initialize();
      },
      error => {
        console.error('Error deleting node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }

  getValidParents(node: TodoItemFlatNode): TodoItemFlatNode[] {
    const descendants = this.treeControl.getDescendants(node);
    // Get the parent of the given node.
    const parent = this.getParentNode(node);
    // Filter out nodes that are either the node itself, its parent, or any of its descendants.
    const validNodesList = this.treeControl.dataNodes.filter(
      (n) => !descendants.includes(n) && n !== node && n !== parent
    );
    return validNodesList;
  }

  editNode(node: TodoItemFlatNode) {
    const flatNode = this.flatNodeMap.get(node);
    if (!flatNode) {
      console.error('FlatNode not found');
      return;
    }

    let updateNodeParent = this.updatedParent;
    const newValue = this.nodeInput[node.item] || '';
    // console.log('New value:', newValue);

    const payload = {
      node: newValue || flatNode.item, // Use the input value if available, otherwise use the existing value
      parent: updateNodeParent ? updateNodeParent.id : flatNode.parent // Use the ID of the new parent if available, otherwise use the existing parent ID
    };

    this.http.patch(`${apiUrl}/update/${node.id}`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe(
      (response: any) => {
        console.log('Node updated successfully:', response);
        this._database.initialize();
      },
      error => {
        console.error('Error updating node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }
}
